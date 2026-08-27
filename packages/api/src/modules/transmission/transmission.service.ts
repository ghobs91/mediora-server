import axios from 'axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Transmission } from 'transmission-client';
import { DeepPartial, TransactionManager, EntityManager } from 'typeorm';

import { Torrent } from 'src/entities/torrent.entity';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { LazyTransaction } from 'src/utils/lazy-transaction';

@Injectable()
export class TransmissionService {
  private client = new Transmission({ host: 'transmission' });

  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly torrentDAO: TorrentDAO
  ) {
    this.logger = logger.child({ context: 'TransmissionService' });
  }

  public removeTorrentAndFiles(torrentHash: string) {
    return this.client.remove(torrentHash, true);
  }

  public async getResourceTorrent(torrentAttributes: DeepPartial<Torrent>) {
    const torrent = await this.torrentDAO.findOneOrFail(torrentAttributes);
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

    const torrentDAO = manager!.getCustomRepository(TorrentDAO);

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
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return this.client.addBase64(base64);
  }
}
