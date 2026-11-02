import { Processor, InjectQueue, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import path from 'path';

import {
  JobsQueue,
  DownloadableMediaState,
  DownloadQueueProcessors,
  FileType,
  OrganizeQueueProcessors,
  ParameterKey,
} from 'src/app.dto';

import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';

import { TransmissionService } from 'src/modules/transmission/transmission.service';
import { ParamsService } from 'src/modules/params/params.service';
import { RedisService } from 'src/modules/redis/redis.service';
import { mapConcurrent } from 'src/utils/map-concurrent';
import {
  isH264Release,
  normalizeReleaseTitle,
} from 'src/utils/torrent-ranking';
import { sanitize } from 'src/utils/sanitize';
import { assessAudio, isH264Codec, probeAudio, probeVideoCodec } from 'src/utils/media-codec';

// If Transmission has no record of a DOWNLOADING torrent for longer than
// this, the daemon likely restarted / evicted it — flip back to MISSING so
// the download-missing loop can re-queue it instead of stalling forever.
const STUCK_TORRENT_MS = 30 * 60 * 1000;

// A torrent that is still "downloading" in Transmission but has moved no data
// for this long has no live peers (dead swarm). Left alone it sits one piece
// short of 100% forever, so the media is never organized and can never be
// played. Reset it for a fresh, better-seeded release instead.
const STALLED_TORRENT_MS = 30 * 60 * 1000;

// Transmission's TR_STATUS_DOWNLOAD: actively trying to download. Stopped,
// queued and checking torrents are deliberately ignored so a user-paused
// torrent is never mistaken for a dead one.
const TRANSMISSION_STATUS_DOWNLOAD = 4;

const REFRESH_CONCURRENCY = 5;
const VIDEO_FILE = /\.(mkv|mp4|avi|m4v|mov|ts)$/i;

interface RejectTorrentArgs {
  resourceId: number;
  resourceType: FileType;
  torrentHash: string;
  name: string;
}

@Processor(JobsQueue.REFRESH_TORRENT)
export class RefreshTorrentProcessor extends WorkerHost {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(JobsQueue.RENAME_AND_LINK)
    private readonly renameAndLinkQueue: Queue,
    @InjectQueue(JobsQueue.DOWNLOAD)
    private readonly downloadQueue: Queue,
    private readonly movieDAO: MovieDAO,
    private readonly torrentDAO: TorrentDAO,
    private readonly transmissionService: TransmissionService,
    private readonly tvSeasonDAO: TVSeasonDAO,
    private readonly tvEpisodeDAO: TVEpisodeDAO,
    private readonly paramsService: ParamsService,
    private readonly redisService: RedisService
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

    // Organizing (rename + link) is the last step of a download. If its job
    // crashed, media would sit in DOWNLOADED forever with every episode stuck
    // in DOWNLOADING, while the torrent is long finished in Transmission. Since
    // nothing else transitions DOWNLOADED -> PROCESSED, re-enqueue the organize
    // job every tick until it succeeds; deduplication keeps it to one pending
    // job per resource.
    await this.retryStuckOrganize();

    this.logger.info('finish refresh torrent status');
  }

  private async retryStuckOrganize() {
    const downloadedMovies = await this.movieDAO.find({
      where: { state: DownloadableMediaState.DOWNLOADED },
    });
    await mapConcurrent(downloadedMovies, REFRESH_CONCURRENCY, (movie) =>
      this.enqueueOrganizeIfTorrentExists(
        movie.id,
        FileType.MOVIE,
        () => this.enqueueOrganizeMovie(movie.id)
      )
    );

    const downloadedSeasons = await this.tvSeasonDAO.find({
      where: { state: DownloadableMediaState.DOWNLOADED },
    });
    await mapConcurrent(downloadedSeasons, REFRESH_CONCURRENCY, (season) =>
      this.enqueueOrganizeIfTorrentExists(
        season.id,
        FileType.SEASON,
        () => this.enqueueOrganizeSeason(season.id)
      )
    );

    const downloadedEpisodes = await this.tvEpisodeDAO.find({
      where: { state: DownloadableMediaState.DOWNLOADED },
    });
    await mapConcurrent(downloadedEpisodes, REFRESH_CONCURRENCY, (episode) =>
      this.enqueueOrganizeIfTorrentExists(
        episode.id,
        FileType.EPISODE,
        () => this.enqueueOrganizeEpisode(episode.id)
      )
    );
  }

  /**
   * Organize resolves its source from the torrent row. Without one the job can
   * only fail, and re-queuing it every tick floods the queue with failures.
   */
  private async enqueueOrganizeIfTorrentExists(
    resourceId: number,
    resourceType: FileType,
    enqueue: () => Promise<unknown>
  ) {
    const torrent = await this.torrentDAO.findOne({
      where: { resourceId, resourceType },
    });

    if (!torrent) {
      this.logger.warn('skipping organize without torrent row', {
        resourceId,
        resourceType,
      });
      return;
    }

    await enqueue();
  }

  private enqueueOrganizeMovie(movieId: number) {
    return this.renameAndLinkQueue.add(
      OrganizeQueueProcessors.HANDLE_MOVIE,
      { movieId },
      { deduplication: { id: `handle-movie-${movieId}` } }
    );
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

    const ignoreH264Releases =
      (await this.paramsService.get(
        ParameterKey.IGNORE_H264_RELEASES
      )) === 'true';

    if (ignoreH264Releases && this.torrentNameIsH264(transmissionTorrent)) {
      await this.rejectForCodec({
        resourceId,
        resourceType,
        torrentHash: torrent.torrentHash,
        name: transmissionTorrent.name,
      });
      return;
    }

    this.logger.info(
      isComplete ? 'torrent download finish' : 'torrent download in progress',
      { resourceId, resourceType }
    );

    if (!isComplete) {
      await this.recoverStalledTorrent({
        resourceId,
        resourceType,
        torrentHash: torrent.torrentHash,
        transmissionTorrent,
      });
      return;
    }

    const requireEnglishAudio =
      (await this.paramsService.get(
        ParameterKey.REQUIRE_ENGLISH_AUDIO
      )) === 'true';

    if (
      requireEnglishAudio &&
      !(await this.hasEnglishAudio(transmissionTorrent))
    ) {
      await this.rejectForAudio({
        resourceId,
        resourceType,
        torrentHash: torrent.torrentHash,
        name: transmissionTorrent.name,
      });
      return;
    }

    if (
      ignoreH264Releases &&
      (await this.hasH264Video(transmissionTorrent))
    ) {
      await this.rejectForCodec({
        resourceId,
        resourceType,
        torrentHash: torrent.torrentHash,
        name: transmissionTorrent.name,
      });
      return;
    }

    if (resourceType === FileType.MOVIE) {
      await this.movieDAO.save({
        id: resourceId,
        state: DownloadableMediaState.DOWNLOADED,
      });
      await this.enqueueOrganizeMovie(resourceId);
    }

    if (resourceType === FileType.SEASON) {
      await this.tvSeasonDAO.save({
        id: resourceId,
        state: DownloadableMediaState.DOWNLOADED,
      });
      await this.enqueueOrganizeSeason(resourceId);
    }

    if (resourceType === FileType.EPISODE) {
      await this.tvEpisodeDAO.save({
        id: resourceId,
        state: DownloadableMediaState.DOWNLOADED,
      });
      await this.enqueueOrganizeEpisode(resourceId);
    }
  }

  private async hasEnglishAudio(torrent: {
    name: string;
    files?: Array<{ name: string }>;
  }): Promise<boolean> {
    const files = (torrent.files ?? []).filter(
      (file) => VIDEO_FILE.test(file.name) && !/sample/i.test(file.name)
    );
    if (files.length === 0) return true;

    const assessments = await mapConcurrent(files, 3, async (file) => ({
      file: file.name,
      assessment: assessAudio(
        await probeAudio(path.join('/downloads/complete', file.name))
      ),
    }));

    const foreign = assessments.filter(
      (item) => item.assessment === 'foreign'
    );
    if (foreign.length > 0) {
      this.logger.warn('torrent has foreign-only audio', {
        name: torrent.name,
        files: foreign,
      });
      return false;
    }

    return true;
  }

  private torrentNameIsH264(torrent: {
    name: string;
    files?: Array<{ name: string }>;
  }): boolean {
    const names = [
      torrent.name,
      ...(torrent.files ?? [])
        .filter((file) => !/sample/i.test(file.name))
        .map((file) => file.name),
    ];
    const parts = names.flatMap((name) =>
      sanitize(name).split(' ').filter(Boolean)
    );
    return isH264Release(parts);
  }

  private async hasH264Video(torrent: {
    name: string;
    files?: Array<{ name: string }>;
  }): Promise<boolean> {
    const files = (torrent.files ?? []).filter(
      (file) => VIDEO_FILE.test(file.name) && !/sample/i.test(file.name)
    );
    if (files.length === 0) return false;

    const probes = await mapConcurrent(files, 3, async (file) => ({
      file: file.name,
      codec: await probeVideoCodec(
        path.join('/downloads/complete', file.name)
      ),
    }));

    const h264 = probes.filter((item) => isH264Codec(item.codec));
    if (h264.length > 0) {
      this.logger.warn('torrent uses ignored h264 codec', {
        name: torrent.name,
        files: h264,
      });
      return true;
    }

    return false;
  }

  private rejectForAudio(args: RejectTorrentArgs) {
    this.logger.warn('rejecting torrent without English audio track', {
      resourceId: args.resourceId,
      resourceType: args.resourceType,
      name: args.name,
    });
    return this.rejectRelease(args);
  }

  private rejectForCodec(args: RejectTorrentArgs) {
    this.logger.warn('rejecting h264 torrent because x264 is ignored', {
      resourceId: args.resourceId,
      resourceType: args.resourceType,
      name: args.name,
    });
    // Do not immediately re-search: a truncation/Link-only result can slip past
    // the search-time filter and is not matchable by the blocklist, so an
    // instant retry would pick the same release again in a tight loop. The
    // 30-minute missing-media sweep retries after the blocklist is in place.
    return this.rejectRelease(args, { retry: false });
  }

  private async rejectRelease(
    { resourceId, resourceType, torrentHash, name }: RejectTorrentArgs,
    { retry = true }: { retry?: boolean } = {}
  ) {
    try {
      await this.transmissionService.removeTorrentAndFiles(torrentHash);
    } catch (error) {
      this.logger.warn('failed to remove rejected torrent', {
        torrentHash,
        error: error instanceof Error ? error.message : error,
      });
    }

    await this.markMissing(resourceId, resourceType);

    let blocked = false;
    try {
      await this.redisService.addRejectedTitle(
        normalizeReleaseTitle(name)
      );
      await this.redisService.addRejectedHash(torrentHash);
      blocked = true;
    } catch (error) {
      this.logger.warn('failed to blocklist rejected release', {
        name,
        error: error instanceof Error ? error.message : error,
      });
    }

    if (!blocked) return;
    if (!retry) return;

    const jobName =
      resourceType === FileType.MOVIE
        ? DownloadQueueProcessors.DOWNLOAD_MOVIE
        : resourceType === FileType.SEASON
          ? DownloadQueueProcessors.DOWNLOAD_SEASON
          : DownloadQueueProcessors.DOWNLOAD_EPISODE;

    try {
      await this.downloadQueue.add(
        jobName,
        { id: resourceId },
        {
          deduplication: {
            id: `download-${resourceType}-${resourceId}`,
          },
        }
      );
    } catch (error) {
      this.logger.warn('failed to enqueue replacement download', {
        resourceId,
        resourceType,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Detects a dead (stalled) download and pauses it for the user.
   *
   * A torrent is only considered stalled while Transmission still reports it
   * as actively downloading (status 4), it has bytes left, and it has moved no
   * data for STALLED_TORRENT_MS. Removal is deliberately left to the user:
   * deleting the torrent and re-searching silently replaced hand-picked
   * releases with whatever the next search returned.
   */
  private async recoverStalledTorrent({
    resourceId,
    resourceType,
    torrentHash,
    transmissionTorrent,
  }: {
    resourceId: number;
    resourceType: FileType;
    torrentHash: string;
    transmissionTorrent: {
      status: number;
      rateDownload: number;
      leftUntilDone: number;
      activityDate: number;
      addedDate: number;
    };
  }) {
    if (transmissionTorrent.status !== TRANSMISSION_STATUS_DOWNLOAD) return;
    if (transmissionTorrent.rateDownload > 0) return;
    if (transmissionTorrent.leftUntilDone <= 0) return;

    const lastActivitySec = Math.max(
      transmissionTorrent.activityDate ?? 0,
      transmissionTorrent.addedDate ?? 0
    );
    const idleMs = Date.now() - lastActivitySec * 1000;
    if (idleMs <= STALLED_TORRENT_MS) return;

    this.logger.warn('torrent stalled with no progress, pausing it', {
      resourceId,
      resourceType,
      idleMs,
      torrentHash,
    });

    await this.transmissionService.pauseTorrentsByHash([torrentHash]);
  }

  private async markMissing(resourceId: number, resourceType: FileType) {
    // The DB row holds a globally-unique torrentHash. If we flip the media
    // back to MISSING without deleting it, the next download of the same
    // Jackett result will hit `duplicate key ... UQ_4e1186fc9ab3a13490f0712c2d1`.
    const stale = await this.torrentDAO.find({
      where: { resourceId, resourceType },
    });
    if (stale.length > 0) {
      this.logger.info('removing stale torrent row', {
        resourceId,
        resourceType,
      });
      await this.torrentDAO.remove(stale);
    }
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