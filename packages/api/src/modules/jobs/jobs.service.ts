import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  JobsQueue,
  DownloadQueueProcessors,
  ScanLibraryQueueProcessors,
} from 'src/app.dto';

@Injectable()
export class JobsService {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(JobsQueue.DOWNLOAD)
    private readonly downloadQueue: Queue,
    @InjectQueue(JobsQueue.RENAME_AND_LINK)
    private readonly renameAndLinkQueue: Queue,
    @InjectQueue(JobsQueue.REFRESH_TORRENT)
    private readonly refreshTorrentQueue: Queue,
    @InjectQueue(JobsQueue.SCAN_LIBRARY)
    private readonly scanLibraryQueue: Queue
  ) {
    this.logger = this.logger.child({ context: 'JobsService' });
    this.startRecurringJobs();
  }

  private startRecurringJobs() {
    // upsertJobScheduler uses a stable scheduler id so reboots / multi-replica
    // boots don't stack duplicate repeatable jobs.
    void this.refreshTorrentQueue
      .upsertJobScheduler(
        'refresh-torrents',
        { pattern: '* * * * *' },
        { name: 'refresh_torrents', data: {} }
      )
      .catch((error: unknown) =>
        this.logger.error('failed to schedule refresh_torrents', { error })
      );

    void this.startScanLibraryScheduler().catch((error: unknown) =>
      this.logger.error('failed to schedule scan library jobs', { error })
    );
  }

  private async startScanLibraryScheduler() {
    await this.scanLibraryQueue.upsertJobScheduler(
      'scan-library',
      { pattern: '0 */6 * * *' },
      {
        name: ScanLibraryQueueProcessors.SCAN_LIBRARY_FOLDER,
        data: {},
      }
    );
    await this.scanLibraryQueue.upsertJobScheduler(
      'find-new-episodes',
      { pattern: '0 */6 * * *' },
      {
        name: ScanLibraryQueueProcessors.FIND_NEW_EPISODES,
        data: {},
      }
    );
    await this.downloadQueue.upsertJobScheduler(
      'download-missing',
      { pattern: '*/30 * * * *' },
      {
        name: DownloadQueueProcessors.DOWNLOAD_MISSING,
        data: {},
      }
    );
  }

  public startDownloadMovie(movieId: number, quality?: string) {
    this.logger.info('add download movie job', { movieId, quality });
    return this.downloadQueue
      .add(
        DownloadQueueProcessors.DOWNLOAD_MOVIE,
        { id: movieId, quality },
        {
          jobId: `${DownloadQueueProcessors.DOWNLOAD_MOVIE}-${movieId}`,
          deduplication: { id: `download-movie-${movieId}` },
        }
      )
      .catch((error: unknown) => {
        // Stable jobId means a retry / double-tap returns the existing job
        // instead of piling up duplicates.
        this.logger.warn('download movie job already queued', {
          movieId,
          error: error instanceof Error ? error.message : error,
        });
        return undefined;
      });
  }

  public startDownloadSeason(seasonId: number, quality?: string) {
    this.logger.info('add download season job', { seasonId, quality });
    return this.downloadQueue
      .add(
        DownloadQueueProcessors.DOWNLOAD_SEASON,
        { id: seasonId, quality },
        {
          jobId: `${DownloadQueueProcessors.DOWNLOAD_SEASON}-${seasonId}`,
          deduplication: { id: `download-season-${seasonId}` },
        }
      )
      .catch((error: unknown) => {
        this.logger.warn('download season job already queued', {
          seasonId,
          error: error instanceof Error ? error.message : error,
        });
        return undefined;
      });
  }

  public startDownloadEpisode(episodeId: number, quality?: string) {
    this.logger.info('add download episode job', { episodeId, quality });
    return this.downloadQueue
      .add(
        DownloadQueueProcessors.DOWNLOAD_EPISODE,
        { id: episodeId, quality },
        {
          jobId: `${DownloadQueueProcessors.DOWNLOAD_EPISODE}-${episodeId}`,
          deduplication: { id: `download-episode-${episodeId}` },
        }
      )
      .catch((error: unknown) => {
        this.logger.warn('download episode job already queued', {
          episodeId,
          error: error instanceof Error ? error.message : error,
        });
        return undefined;
      });
  }

  public startScanLibrary(options?: JobsOptions) {
    this.logger.info('add scan library job');
    return this.scanLibraryQueue.add(
      ScanLibraryQueueProcessors.SCAN_LIBRARY_FOLDER,
      {},
      options
    );
  }

  public startFindNewEpisodes(options?: JobsOptions) {
    this.logger.info('start find new episodes');
    return this.scanLibraryQueue.add(
      ScanLibraryQueueProcessors.FIND_NEW_EPISODES,
      {},
      options
    );
  }

  public startDownloadMissing(options?: JobsOptions) {
    this.logger.info('start download missing files');
    return this.downloadQueue.add(
      DownloadQueueProcessors.DOWNLOAD_MISSING,
      {},
      options
    );
  }
}