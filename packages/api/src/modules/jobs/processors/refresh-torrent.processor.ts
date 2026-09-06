import { Processor, InjectQueue, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  JobsQueue,
  DownloadableMediaState,
  FileType,
  OrganizeQueueProcessors,
} from 'src/app.dto';

import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';

import { TransmissionService } from 'src/modules/transmission/transmission.service';
import { mapConcurrent } from 'src/utils/map-concurrent';

// If Transmission has no record of a DOWNLOADING torrent for longer than
// this, the daemon likely restarted / evicted it — flip back to MISSING so
// the download-missing loop can re-queue it instead of stalling forever.
const STUCK_TORRENT_MS = 30 * 60 * 1000;
const REFRESH_CONCURRENCY = 5;

@Processor(JobsQueue.REFRESH_TORRENT)
export class RefreshTorrentProcessor extends WorkerHost {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(JobsQueue.RENAME_AND_LINK)
    private readonly renameAndLinkQueue: Queue,
    private readonly movieDAO: MovieDAO,
    private readonly torrentDAO: TorrentDAO,
    private readonly transmissionService: TransmissionService,
    private readonly tvSeasonDAO: TVSeasonDAO,
    private readonly tvEpisodeDAO: TVEpisodeDAO
  ) {
    super();
    this.logger = logger.child({ context: 'RefreshTorrentProcessor' });
  }

  public process(_job: Job) {
    return this.refreshTorrents();
  }

  public async refreshTorrents() {
    this.logger.info('start refresh torrent status');

    const donwloadingMovies = await this.movieDAO.find({
      where: { state: DownloadableMediaState.DOWNLOADING },
    });

    await mapConcurrent(donwloadingMovies, REFRESH_CONCURRENCY, (movie) =>
      this.checkTorrentSafe({ resourceId: movie.id, resourceType: FileType.MOVIE })
    );

    const downloadingSeasons = await this.tvSeasonDAO.find({
      where: { state: DownloadableMediaState.DOWNLOADING },
    });

    await mapConcurrent(downloadingSeasons, REFRESH_CONCURRENCY, (season) =>
      this.checkTorrentSafe({
        resourceId: season.id,
        resourceType: FileType.SEASON,
      })
    );

    const downloadEpisodes = await this.tvEpisodeDAO.find({
      where: { state: DownloadableMediaState.DOWNLOADING },
    });

    await mapConcurrent(downloadEpisodes, REFRESH_CONCURRENCY, (episode) =>
      this.checkTorrentSafe({
        resourceId: episode.id,
        resourceType: FileType.EPISODE,
      })
    );

    this.logger.info('finish refresh torrent status');
  }

  private async checkTorrentSafe(args: {
    resourceId: number;
    resourceType: FileType;
  }) {
    try {
      await this.checkTorrent(args);
    } catch (error) {
      // One bad row / Transmission blip must not kill the whole minute-tick.
      this.logger.error('refresh torrent item failed, continuing batch', {
        ...args,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private async checkTorrent({
    resourceId,
    resourceType,
  }: {
    resourceId: number;
    resourceType: FileType;
  }) {
    this.logger.info('refresh torrent status', { resourceId, resourceType });

    const torrent = await this.torrentDAO.findOne({
      where: { resourceId, resourceType },
    });

    if (!torrent) {
      // Row deleted but media still DOWNLOADING — release it for re-download.
      this.logger.warn('torrent row missing, resetting media to MISSING', {
        resourceId,
        resourceType,
      });
      await this.markMissing(resourceId, resourceType);
      return;
    }

    let transmissionTorrent;
    try {
      transmissionTorrent = await this.transmissionService.getTorrent(
        torrent.torrentHash
      );
    } catch (error) {
      this.logger.warn('transmission lookup failed, will retry next tick', {
        resourceId,
        resourceType,
        error: error instanceof Error ? error.message : error,
      });
      return;
    }

    if (!transmissionTorrent) {
      const stuckForMs = Date.now() - new Date(torrent.updatedAt).getTime();
      this.logger.warn('torrent missing in transmission', {
        resourceId,
        resourceType,
        stuckForMs,
      });
      if (stuckForMs > STUCK_TORRENT_MS) {
        this.logger.error('torrent stuck, resetting media to MISSING', {
          resourceId,
          resourceType,
        });
        await this.markMissing(resourceId, resourceType);
      }
      return;
    }

    const isComplete = transmissionTorrent?.percentDone === 1;

    this.logger.info(
      isComplete ? 'torrent download finish' : 'torrent download in progress',
      { resourceId, resourceType }
    );

    if (isComplete) {
      if (resourceType === FileType.MOVIE) {
        await this.movieDAO.save({
          id: resourceId,
          state: DownloadableMediaState.DOWNLOADED,
        });
        await this.renameAndLinkQueue.add(
          OrganizeQueueProcessors.HANDLE_MOVIE,
          { movieId: resourceId },
          {
            jobId: `${OrganizeQueueProcessors.HANDLE_MOVIE}-${resourceId}`,
            deduplication: { id: `handle-movie-${resourceId}` },
          }
        );
      }

      if (resourceType === FileType.SEASON) {
        await this.tvSeasonDAO.save({
          id: resourceId,
          state: DownloadableMediaState.DOWNLOADED,
        });
        await this.renameAndLinkQueue.add(
          OrganizeQueueProcessors.HANDLE_SEASON,
          { seasonId: resourceId },
          {
            jobId: `${OrganizeQueueProcessors.HANDLE_SEASON}-${resourceId}`,
            deduplication: { id: `handle-season-${resourceId}` },
          }
        );
      }

      if (resourceType === FileType.EPISODE) {
        await this.tvEpisodeDAO.save({
          id: resourceId,
          state: DownloadableMediaState.DOWNLOADED,
        });
        await this.renameAndLinkQueue.add(
          OrganizeQueueProcessors.HANDLE_EPISODE,
          { episodeId: resourceId },
          {
            jobId: `${OrganizeQueueProcessors.HANDLE_EPISODE}-${resourceId}`,
            deduplication: { id: `handle-episode-${resourceId}` },
          }
        );
      }
    }
  }

  private async markMissing(resourceId: number, resourceType: FileType) {
    if (resourceType === FileType.MOVIE) {
      await this.movieDAO.save({
        id: resourceId,
        state: DownloadableMediaState.MISSING,
      });
    } else if (resourceType === FileType.SEASON) {
      await this.tvSeasonDAO.save({
        id: resourceId,
        state: DownloadableMediaState.MISSING,
      });
    } else {
      await this.tvEpisodeDAO.save({
        id: resourceId,
        state: DownloadableMediaState.MISSING,
      });
    }
  }
}