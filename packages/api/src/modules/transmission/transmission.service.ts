import axios from 'axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Transmission } from 'transmission-client';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';

import { FileType } from 'src/app.dto';
import { Torrent } from 'src/entities/torrent.entity';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TransactionManager, LazyTransaction } from 'src/utils/transaction';
import { env } from 'src/env';

const TORRENT_FILE_TIMEOUT_MS = 15000;
const TORRENT_FILE_MAX_BYTES = 10 * 1024 * 1024;

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

    const torrentEntity = await torrentDAO.save({
      ...torrentAttributes,
      torrentHash: transmissionTorrent.hashString,
    });

    return torrentEntity;
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