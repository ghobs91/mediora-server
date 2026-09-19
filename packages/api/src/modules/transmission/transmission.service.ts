import axios from 'axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Transmission } from 'transmission-client';
import type { Torrent as TransmissionTorrent } from 'transmission-client/typings/interface';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';

import { FileType } from 'src/app.dto';
import { Torrent } from 'src/entities/torrent.entity';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TransactionManager, LazyTransaction } from 'src/utils/transaction';
import { env } from 'src/env';

const TORRENT_FILE_TIMEOUT_MS = 15000;
const TORRENT_FILE_MAX_BYTES = 10 * 1024 * 1024;

// Only the fields the Downloads tab renders. The client's default `all()` pulls
// `files`, `peers`, `trackerStats` and `pieces` too, which is a lot to ship to
// the browser every poll.
const TORRENT_LIST_FIELDS = [
  'hashString',
  'id',
  'name',
  'status',
  'error',
  'errorString',
  'percentDone',
  'rateDownload',
  'rateUpload',
  'uploadRatio',
  'downloadedEver',
  'uploadedEver',
  'totalSize',
  'sizeWhenDone',
  'leftUntilDone',
  'eta',
  'addedDate',
  'doneDate',
  'isFinished',
  'peersConnected',
  'peersSendingToUs',
  'peersGettingFromUs',
  'downloadDir',
];

@Injectable()
export class TransmissionService {
  private client = new Transmission({
    host: env.TRANSMISSION_HOST,
    port: env.TRANSMISSION_PORT,
  });

  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly dataSource: DataSource,
    private readonly torrentDAO: TorrentDAO
  ) {
    this.logger = logger.child({ context: 'TransmissionService' });
  }

  public removeTorrentAndFiles(torrentHash: string) {
    return this.client.remove(torrentHash, true);
  }

  public async pauseTorrents(ids: { resourceId: number; resourceType: FileType }[]) {
    return this.client.stop(await this.getHashes(ids));
  }

  public async resumeTorrents(ids: { resourceId: number; resourceType: FileType }[]) {
    return this.client.start(await this.getHashes(ids));
  }

  public async removeTorrents(ids: { resourceId: number; resourceType: FileType }[]) {
    return this.client.remove(await this.getHashes(ids), false);
  }

  public async removeTorrentsAndFiles(ids: { resourceId: number; resourceType: FileType }[]) {
    return this.client.remove(await this.getHashes(ids), true);
  }

  private async getHashes(ids: { resourceId: number; resourceType: FileType }[]) {
    const torrents = await this.torrentDAO.find({ where: ids });
    return torrents.map((torrent) => torrent.torrentHash);
  }

  public async getResourceTorrent(torrentAttributes: DeepPartial<Torrent>) {
    const torrent = await this.torrentDAO.findOne({
      where: torrentAttributes as Torrent,
    });
    if (!torrent) return null;

    const transmissionTorrent = await this.getTorrent(torrent.torrentHash);
    return { ...torrent, transmissionTorrent };
  }

  public getTorrent(torrentHash: string) {
    return this.client
      .get(torrentHash)
      .then(({ torrents: [torrent] }) => torrent);
  }

  // Every torrent in Transmission, independent of mediora's own tracking.
  public async getAllTorrents(): Promise<TransmissionTorrent[]> {
    const { torrents } = await this.client.callServer({
      arguments: { fields: TORRENT_LIST_FIELDS },
      method: 'torrent-get',
      tag: 'mediora-list-torrents',
    });
    return torrents;
  }

  public pauseTorrentsByHash(hashes: string[]) {
    return this.client.stop(hashes);
  }

  public resumeTorrentsByHash(hashes: string[]) {
    return this.client.start(hashes);
  }

  public removeTorrentsByHash(hashes: string[], deleteData: boolean) {
    return this.client.remove(hashes, deleteData);
  }

  public pauseAllTorrents() {
    return this.client.stopAll();
  }

  public resumeAllTorrents() {
    return this.client.startAll();
  }

  @LazyTransaction()
  public async addTorrent(
    {
      torrent,
      torrentType,
      torrentAttributes,
    }: {
      torrent: string;
      torrentType: 'url' | 'base64';
      torrentAttributes: DeepPartial<Torrent>;
    },
    @TransactionManager() manager: EntityManager | null
  ) {
    this.logger.info(
      `start download torrent from ${torrentType}`,
      torrentAttributes
    );

    const torrentDAO = TorrentDAO.fromManager(manager!);

    const transmissionTorrent =
      torrentType === 'url'
        ? await this.addURL(torrent)
        : await this.client.addBase64(torrent);

    this.logger.info('torrent download started', torrentAttributes);

    const torrentHash = transmissionTorrent.hashString.toLowerCase();
    const resourceType = torrentAttributes.resourceType as Torrent['resourceType'];
    const resourceId = torrentAttributes.resourceId as Torrent['resourceId'];

    // Idempotent insert: a previous attempt (or a stale row left behind when
    // Transmission lost the torrent) may already hold this hash. The
    // `torrentHash` column is globally unique, so a blind insert would raise
    // `duplicate key value violates unique constraint "UQ_..."`. Reuse the
    // existing row instead, re-pointing it at the current resource.
    const existingByHash = await torrentDAO.findOne({
      where: { torrentHash },
    });
    if (existingByHash) {
      return torrentDAO.save({
        ...existingByHash,
        ...torrentAttributes,
        torrentHash,
      });
    }

    // Clean up stale rows for the same resource (e.g. retry with a different
    // hash after the refresh tick reset the media to MISSING without
    // deleting the old row), so they can never collide on a later retry.
    if (resourceType !== undefined && resourceId !== undefined) {
      const stale = await torrentDAO.find({
        where: { resourceType, resourceId } as Partial<Torrent>,
      });
      if (stale.length > 0) {
        await torrentDAO.remove(stale);
      }
    }

    try {
      return await torrentDAO.save({
        ...torrentAttributes,
        torrentHash,
      });
    } catch (error) {
      // Race guard: two concurrent downloads of the same torrent both passed
      // the `findOne` above. On unique violation, fetch the winner and reuse
      // it instead of surfacing a raw QueryFailedError.
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
      ) {
        const winner = await torrentDAO.findOne({ where: { torrentHash } });
        if (winner) {
          this.logger.warn('torrent already tracked, reusing existing row', {
            torrentHash,
          });
          return torrentDAO.save({
            ...winner,
            ...torrentAttributes,
            torrentHash,
          });
        }
      }
      throw error;
    }
  }

  private async addURL(url: string) {
    if (url.startsWith('magnet')) {
      return this.client.addMagnet(url, {});
    }

    const finalUrl = await this.resolveRedirects(url);

    // redirected to a magnet uri, start it as magnet
    if (finalUrl.startsWith('magnet')) {
      return this.client.addMagnet(finalUrl, {});
    }

    return this.downloadTorrentFile(finalUrl);
  }

  private async resolveRedirects(url: string): Promise<string> {
    let current = url;

    for (let i = 0; i < 10; i += 1) {
      const response = await axios.get(current, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        timeout: 15000,
      });

      const location = response.headers.location as string | undefined;
      if (!location) return current;

      current = new URL(location, current).toString();
      if (current.startsWith('magnet:')) return current;
    }

    return current;
  }

  private async downloadTorrentFile(url: string) {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: TORRENT_FILE_TIMEOUT_MS,
      maxContentLength: TORRENT_FILE_MAX_BYTES,
      maxBodyLength: TORRENT_FILE_MAX_BYTES,
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return this.client.addBase64(base64);
  }
}