import { Processor, InjectQueue, WorkerHost } from '@nestjs/bullmq';
import { forEachSeries } from 'p-iteration';
import { groupBy } from 'lodash';
import { Job, Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  JobsQueue,
  DownloadableMediaState,
  DownloadQueueProcessors,
} from 'src/app.dto';

import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';

import { JackettService } from 'src/modules/jackett/jackett.service';
import { LibraryDownloadService } from 'src/modules/library/library-download.service';
import { ParamsService } from 'src/modules/params/params.service';

@Processor(JobsQueue.DOWNLOAD)
export class DownloadProcessor extends WorkerHost {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(JobsQueue.DOWNLOAD) private readonly downloadQueue: Queue,
    private readonly movieDAO: MovieDAO,
    private readonly tvSeasonDAO: TVSeasonDAO,
    private readonly tvEpisodeDAO: TVEpisodeDAO,
    private readonly jackettService: JackettService,
    private readonly libraryService: LibraryDownloadService,
    private readonly paramsService: ParamsService
  ) {
    super();
    this.logger = logger.child({ context: 'DownloadProcessor' });
  }

  private async resolveQualityName(
    qualityId?: number | null,
  ): Promise<string | undefined> {
    if (!qualityId) return undefined;
    const quality = await this.paramsService.getQualityById(qualityId);
    return quality?.name;
  }

  public async process(job: Job) {
    switch (job.name) {
      case DownloadQueueProcessors.DOWNLOAD_MISSING:
        return this.downloadMissing();
      case DownloadQueueProcessors.DOWNLOAD_MOVIE:
        return this.downloadMovie(job as Job<{ id: number; quality?: string }>);
      case DownloadQueueProcessors.DOWNLOAD_SEASON:
        return this.downloadSeason(job as Job<{ id: number; quality?: string }>);
      case DownloadQueueProcessors.DOWNLOAD_EPISODE:
        return this.downloadEpisode(job as Job<{ id: number; quality?: string }>);
      default:
        this.logger.warn('unknown download job name', { name: job.name });
    }
  }

  public async downloadMissing() {
    this.logger.info('start try download missing files');

    const missingMovies = await this.movieDAO.find({
      where: { state: DownloadableMediaState.MISSING },
    });

    this.logger.info(`found ${missingMovies.length} missing movies`);

    await forEachSeries(missingMovies, async (movie) => {
      const quality = await this.resolveQualityName(movie.qualityId);
      return this.downloadQueue.add(
        DownloadQueueProcessors.DOWNLOAD_MOVIE,
        {
          id: movie.id,
          quality,
        },
        {
          jobId: `${DownloadQueueProcessors.DOWNLOAD_MOVIE}-${movie.id}`,
          deduplication: { id: `download-movie-${movie.id}` },
        }
      );
    });

    const missingEpisodes = await this.tvEpisodeDAO.findMissingFromLibrary();
    this.logger.info(`found ${missingEpisodes.length} missing tv episodes`);

    const episodesBySeason = groupBy(
      missingEpisodes,
      (episode) => episode.seasonId
    );

    await forEachSeries(Object.values(episodesBySeason), async (episodes) => {
      const { seasonId } = episodes[0];
      const quality = await this.resolveQualityName(
        episodes[0].tvShow?.qualityId
      );
      const season = await this.tvSeasonDAO.findOne({ where: { id: seasonId } });

      // Prefer a single well-seeded season pack over many weak single-episode
      // torrents. `downloadSeason` falls back to per-episode downloads when no
      // acceptable pack exists and marks the season PROCESSED, so we only try a
      // pack while the season has not been started yet (SEARCHING/MISSING).
      const shouldTrySeasonPack =
        season?.state === DownloadableMediaState.SEARCHING ||
        season?.state === DownloadableMediaState.MISSING;

      if (shouldTrySeasonPack) {
        await this.downloadQueue.add(
          DownloadQueueProcessors.DOWNLOAD_SEASON,
          {
            id: seasonId,
            quality,
          },
          {
            jobId: `${DownloadQueueProcessors.DOWNLOAD_SEASON}-${seasonId}`,
            deduplication: { id: `download-season-${seasonId}` },
          }
        );
        return;
      }

      await forEachSeries(episodes, (episode) =>
        this.downloadQueue.add(
          DownloadQueueProcessors.DOWNLOAD_EPISODE,
          {
            id: episode.id,
            quality,
          },
          {
            jobId: `${DownloadQueueProcessors.DOWNLOAD_EPISODE}-${episode.id}`,
            deduplication: { id: `download-episode-${episode.id}` },
          }
        )
      );
    });

    this.logger.info('finish try download missing files');
  }

  public async downloadMovie({ data }: Job<{ id: number; quality?: string }>) {
    const { id: movieId, quality } = data;
    this.logger.info('start download movie', { movieId, quality });

    const [bestResult] = await this.jackettService.searchMovie(movieId, quality);
    if (!(await this.canRun({ movieId }))) return;

    if (bestResult === undefined) {
      this.logger.error('movie torrent not found');
      await this.movieDAO.save({
        id: movieId,
        state: DownloadableMediaState.MISSING,
      });
      return;
    }

    await this.libraryService.downloadMovie(
      movieId,
      {
        title: bestResult.title,
        downloadLink: bestResult.downloadLink,
        tag: bestResult.tag.label,
        quality: bestResult.quality.label,
      },
      null
    );

    return;
  }

  public async downloadSeason({ data }: Job<{ id: number; quality?: string }>) {
    const { id: seasonId, quality } = data;
    this.logger.info('start download season', { seasonId, quality });

    const [bestResult] = await this.jackettService.searchSeason(seasonId, quality);
    if (!(await this.canRun({ seasonId }))) return;

    if (bestResult === undefined) {
      this.logger.error('season not found, will split download into episodes');

      // set season as processed we wont rety a full episodes pack download
      await this.tvSeasonDAO.save({
        id: seasonId,
        state: DownloadableMediaState.PROCESSED,
      });

      const season = await this.tvSeasonDAO.findOne({
        where: { id: seasonId },
        relations: ['episodes', 'tvShow'],
      });

      // season can already be removed from library
      if (season) {
        const quality = await this.resolveQualityName(season.tvShow?.qualityId);
        await forEachSeries(season.episodes, (episode) =>
          this.downloadQueue.add(
            DownloadQueueProcessors.DOWNLOAD_EPISODE,
            {
              id: episode.id,
              quality,
            },
            {
              jobId: `${DownloadQueueProcessors.DOWNLOAD_EPISODE}-${episode.id}`,
              deduplication: { id: `download-episode-${episode.id}` },
            }
          )
        );
      }

      return;
    }

    await this.libraryService.downloadTVSeason(
      seasonId,
      {
        title: bestResult.title,
        downloadLink: bestResult.downloadLink,
        tag: bestResult.tag.label,
        quality: bestResult.quality.label,
      },
      null
    );

    return;
  }

  public async downloadEpisode({ data }: Job<{ id: number; quality?: string }>) {
    const { id: episodeId, quality } = data;
    this.logger.info('start download episode', { episodeId, quality });

    const [bestResult] = await this.jackettService.searchEpisode(episodeId, quality);
    if (!(await this.canRun({ episodeId }))) return;

    if (bestResult === undefined) {
      this.logger.error('episode torrent not found');
      await this.tvEpisodeDAO.save({
        id: episodeId,
        state: DownloadableMediaState.MISSING,
      });
      return;
    }

    await this.libraryService.downloadTVEpisode(
      episodeId,
      {
        title: bestResult.title,
        downloadLink: bestResult.downloadLink,
        tag: bestResult.tag.label,
        quality: bestResult.quality.label,
      },
      null
    );

    return;
  }

  // check if job should continue
  // media can be already removed from database
  // when results are found from jackett
  private async canRun(media: {
    movieId?: number;
    seasonId?: number;
    episodeId?: number;
  }) {
    if (
      (media.movieId && !(await this.movieDAO.findOne({ where: { id: media.movieId } }))) ||
      (media.seasonId && !(await this.tvSeasonDAO.findOne({ where: { id: media.seasonId } }))) ||
      (media.episodeId && !(await this.tvEpisodeDAO.findOne({ where: { id: media.episodeId } })))
    ) {
      this.logger.warn(
        'media already removed from database, this job will stop',
        media
      );
      return false;
    }

    return true;
  }
}
