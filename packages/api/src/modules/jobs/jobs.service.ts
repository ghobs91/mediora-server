import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { In } from 'typeorm';

import {
  JobsQueue,
  DownloadQueueProcessors,
  ScanLibraryQueueProcessors,
  OrganizeQueueProcessors,
  FileType,
} from 'src/app.dto';

import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { Torrent } from 'src/entities/torrent.entity';

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
    private readonly scanLibraryQueue: Queue,
    private readonly tvSeasonDAO: TVSeasonDAO,
    private readonly tvEpisodeDAO: TVEpisodeDAO,
    private readonly torrentDAO: TorrentDAO
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
          deduplication: { id: `download-movie-${movieId}` },
        }
      )
      .catch((error: unknown) => {
        // Deduplication means a retry / double-tap is ignored while a job for
        // this media is still pending, but a previously failed job does not
        // block future attempts.
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

  /**
   * Re-run organize for every season/episode of a show that still has a torrent
   * row, so library entries created by older organize behaviour (e.g. symlinks
   * the media server cannot resolve) can be repaired without re-downloading.
   * Only resources whose torrent is still known can be re-placed: organize
   * reads the files back from the download location.
   */
  public async startReorganizeTVShow(tvShowId: number) {
    this.logger.info('add reorganize tvshow jobs', { tvShowId });

    const [seasons, episodes] = await Promise.all([
      this.tvSeasonDAO.find({ where: { tvShowId } }),
      this.tvEpisodeDAO.find({ where: { tvShowId } }),
    ]);

    const seasonTorrents = seasons.length
      ? await this.torrentDAO.find({
          where: {
            resourceType: FileType.SEASON,
            resourceId: In(seasons.map((season) => season.id)),
          },
        })
      : [];
    const episodeTorrents = episodes.length
      ? await this.torrentDAO.find({
          where: {
            resourceType: FileType.EPISODE,
            resourceId: In(episodes.map((episode) => episode.id)),
          },
        })
      : [];

    // A season pack covers all of its episodes, so only reorganize episodes
    // whose season has no pack of its own.
    const packedSeasonIds = new Set(
      seasonTorrents.map((torrent) => torrent.resourceId)
    );
    const episodeIds = episodeTorrents
      .map((torrent) => torrent.resourceId)
      .filter((episodeId) => {
        const episode = episodes.find((item) => item.id === episodeId);
        return episode ? !packedSeasonIds.has(episode.seasonId) : false;
      });

    await Promise.all([
      ...seasonTorrents.map((torrent) =>
        this.enqueueOrganizeSeason(torrent.resourceId)
      ),
      ...episodeIds.map((episodeId) =>
        this.enqueueOrganizeEpisode(episodeId)
      ),
    ]);

    return { seasons: seasonTorrents.length, episodes: episodeIds.length };
  }

  /**
   * Re-run organize for every movie/season/episode that still has a torrent
   * row. Repairs library-wide entries created by older organize behaviour
   * (e.g. symlinks the media server cannot resolve) without re-downloading.
   */
  public async startReorganizeLibrary() {
    this.logger.info('add reorganize library jobs');

    const torrents = await this.torrentDAO.find({
      where: {
        resourceType: In([FileType.MOVIE, FileType.SEASON, FileType.EPISODE]),
      },
    });

    await Promise.all(
      torrents.map((torrent) => this.enqueueOrganizeByTorrent(torrent))
    );

    return {
      movies: torrents.filter((torrent) => torrent.resourceType === FileType.MOVIE)
        .length,
      seasons: torrents.filter(
        (torrent) => torrent.resourceType === FileType.SEASON
      ).length,
      episodes: torrents.filter(
        (torrent) => torrent.resourceType === FileType.EPISODE
      ).length,
    };
  }

  private enqueueOrganizeByTorrent(torrent: Torrent) {
    if (torrent.resourceType === FileType.MOVIE) {
      return this.renameAndLinkQueue.add(
        OrganizeQueueProcessors.HANDLE_MOVIE,
        { movieId: torrent.resourceId },
        { deduplication: { id: `handle-movie-${torrent.resourceId}` } }
      );
    }
    if (torrent.resourceType === FileType.SEASON) {
      return this.enqueueOrganizeSeason(torrent.resourceId);
    }
    if (torrent.resourceType === FileType.EPISODE) {
      return this.enqueueOrganizeEpisode(torrent.resourceId);
    }
    return Promise.resolve(undefined);
  }

  private enqueueOrganizeSeason(seasonId: number) {
    return this.renameAndLinkQueue.add(
      OrganizeQueueProcessors.HANDLE_SEASON,
      { seasonId },
      { deduplication: { id: `handle-season-${seasonId}` } }
    );
  }

  private enqueueOrganizeEpisode(episodeId: number) {
    return this.renameAndLinkQueue.add(
      OrganizeQueueProcessors.HANDLE_EPISODE,
      { episodeId },
      { deduplication: { id: `handle-episode-${episodeId}` } }
    );
  }
}