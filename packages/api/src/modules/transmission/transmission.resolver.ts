import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { map } from 'p-iteration';

import { GraphQLCommonResponse } from 'src/app.dto';

import { TorrentDAO } from 'src/entities/dao/torrent.dao';

import {
  TorrentStatus,
  GetTorrentStatusInput,
  ControlTorrentInput,
} from './transmission.dto';
import { TransmissionService } from './transmission.service';

@Resolver()
export class TransmissionResolver {
  public constructor(
    private readonly torrentDAO: TorrentDAO,
    private readonly transmissionService: TransmissionService
  ) {}

  @Query((_returns) => [TorrentStatus])
  public getTorrentStatus(
    @Args('torrents', { type: () => [GetTorrentStatusInput] })
    torrents: GetTorrentStatusInput[]
  ) {
    return map(torrents, async ({ resourceId, resourceType }) => {
      const torrent = await this.torrentDAO.findOneOrFail({
        where: { resourceId, resourceType },
      });

      const torrentStatus = await this.transmissionService.getTorrent(
        torrent.torrentHash
      );

      return { ...torrentStatus, resourceId, resourceType };
    });
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async pauseTorrents(
    @Args('torrents', { type: () => [ControlTorrentInput] })
    torrents: ControlTorrentInput[]
  ) {
    await this.transmissionService.pauseTorrents(torrents);
    return { success: true, message: 'DOWNLOADS_PAUSED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async resumeTorrents(
    @Args('torrents', { type: () => [ControlTorrentInput] })
    torrents: ControlTorrentInput[]
  ) {
    await this.transmissionService.resumeTorrents(torrents);
    return { success: true, message: 'DOWNLOADS_RESUMED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async removeTorrents(
    @Args('torrents', { type: () => [ControlTorrentInput] })
    torrents: ControlTorrentInput[]
  ) {
    await this.transmissionService.removeTorrents(torrents);
    return { success: true, message: 'DOWNLOADS_REMOVED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async removeTorrentsAndFiles(
    @Args('torrents', { type: () => [ControlTorrentInput] })
    torrents: ControlTorrentInput[]
  ) {
    await this.transmissionService.removeTorrentsAndFiles(torrents);
    return { success: true, message: 'DOWNLOADS_REMOVED_AND_FILES_DELETED' };
  }
}
