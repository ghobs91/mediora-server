import dayjs from "dayjs";
import leven from "leven";
import path from "path";
import { promises as fs } from "fs";
import { Processor, InjectQueue, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { times, orderBy } from "lodash";
import { Job, Queue } from "bullmq";

import { DataSource, EntityManager, Like, IsNull } from "typeorm";

import { Transaction, TransactionManager } from "src/utils/transaction";

import { forEachSeries, map, mapSeries } from "p-iteration";

import { LIBRARY_CONFIG } from "src/config";
import { mapConcurrent } from "src/utils/map-concurrent";

import {
  JobsQueue,
  DownloadableMediaState,
  ScanLibraryQueueProcessors,
  ParameterKey,
} from "src/app.dto";

import { sanitize } from "src/utils/sanitize";
import { parseTvFile } from "src/utils/parse-tv-episode";
import { formatNumber } from "src/utils/format-number";
import { isH264Codec, probeVideoCodec, assessAudio, probeAudio } from "src/utils/media-codec";
import { normalizeReleaseTitle, pickSmallestH265Upgrade } from "src/utils/torrent-ranking";

import { JobsService } from "src/modules/jobs//jobs.service";
import { TMDBService } from "src/modules/tmdb/tmdb.service";
import { JackettService } from "src/modules/jackett/jackett.service";
import { LibraryDownloadService } from "src/modules/library/library-download.service";
import { ParamsService } from "src/modules/params/params.service";
import { RedisService } from "src/modules/redis/redis.service";

import { MovieDAO } from "src/entities/dao/movie.dao";
import { TVShowDAO } from "src/entities/dao/tvshow.dao";
import { TVEpisodeDAO } from "src/entities/dao/tvepisode.dao";
import { TVEpisode } from "src/entities/tvepisode.entity";
import { TVSeasonDAO } from "src/entities/dao/tvseason.dao";
import { FileDAO } from "src/entities/dao/file.dao";
import { LibraryFoldersService } from "src/modules/library/library-folders.service";
import { MediaMountsService } from "src/modules/library/media-mounts.service";

const VIDEO_FILE = /\.(mkv|mp4|avi|m4v|mov|ts)$/i;
const MAX_REPLACEMENTS_PER_RUN = 25;

interface UpgradeTarget {
  kind: "movie" | "episode";
  id: number;
  label: string;
  qualityId: number | null;
  files: string[];
}

interface UpgradeOutcome {
  status: "replaced" | "skipped" | "failed";
  savedBytes?: number;
}

@Processor(JobsQueue.SCAN_LIBRARY)
export class ScanLibraryProcessor extends WorkerHost {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly dataSource: DataSource,
    @InjectQueue(JobsQueue.SCAN_LIBRARY)
    private readonly scanLibraryQueue: Queue,
    private readonly jobsService: JobsService,
    private readonly tmdbService: TMDBService,
    private readonly tvEpisodeDAO: TVEpisodeDAO,
    private readonly libraryFoldersService: LibraryFoldersService,
    private readonly mediaMountsService: MediaMountsService,
    private readonly movieDAO: MovieDAO,
    private readonly jackettService: JackettService,
    private readonly libraryDownloadService: LibraryDownloadService,
    private readonly paramsService: ParamsService,
    private readonly redisService: RedisService,
  ) {
    super();
    this.logger = logger.child({ context: "ScanLibrary" });
  }

  public async process(job: Job): Promise<any> {
    switch (job.name) {
      case ScanLibraryQueueProcessors.FIND_NEW_EPISODES:
        return this.findNewEpisodes();
      case ScanLibraryQueueProcessors.SCAN_LIBRARY_FOLDER:
        return this.scanLibrary();
      case ScanLibraryQueueProcessors.SCAN_MOVIES_FOLDER:
        return this.scanMoviesFolder();
      case ScanLibraryQueueProcessors.SCAN_TV_SHOWS_FOLDER:
        return this.scanTVShowsFolder();
      case ScanLibraryQueueProcessors.PROCESS_MOVIE_FOLDER:
        return this.processMovieFolder(job as Job<{ movie: string }>);
      case ScanLibraryQueueProcessors.PROCESS_TV_SHOW_FOLDER:
        return this.processTVShow(job as Job<{ tvshow: string }>);
      case ScanLibraryQueueProcessors.REPLACE_H264_MEDIA:
        return this.replaceH264Media();
      case ScanLibraryQueueProcessors.REPLACE_FOREIGN_AUDIO:
        return this.replaceForeignAudioMedia();
      default:
        this.logger.warn("unknown scan library job name", { name: job.name });
        return undefined;
    }
  }

  public async findNewEpisodes() {
    this.logger.info("start find new tvshow episodes");

    const tvShowLastEpisodeTracked = await this.tvEpisodeDAO
      .createQueryBuilder("episode")
      .distinctOn(["episode.tvShow"])
      .leftJoinAndSelect("episode.tvShow", "tvShow")
      .leftJoinAndSelect("episode.season", "season")
      .orderBy("episode.tvShow", "DESC")
      .addOrderBy("episode.seasonNumber", "DESC")
      .addOrderBy("episode.episodeNumber", "DESC")
      .getMany();

    this.logger.info(`found ${tvShowLastEpisodeTracked.length} seasons`);

    await forEachSeries(tvShowLastEpisodeTracked, async (episode) => {
      const tmdbResult = await this.tmdbService
        .getTVShowSeasons(episode.tvShow.tmdbId)
        .then((seasons) =>
          seasons.find(
            (season) => season.seasonNumber === episode.seasonNumber,
          ),
        );

      if (!tmdbResult) {
        this.logger.info("did not find tmdb season", { episode });
        throw new Error("did not find tmdb season");
      }

      const newEpisodesCount = tmdbResult.episodeCount - episode.episodeNumber;

      this.logger.info(`found ${newEpisodesCount} new episodes`, {
        tvShow: episode.tvShow.title,
        seasonNumber: episode.seasonNumber,
      });

      if (newEpisodesCount > 0) {
        const newEpisodes = (await this.tvEpisodeDAO.save(
          times(newEpisodesCount, (index) => ({
            tvShow: episode.tvShow,
            season: episode.season,
            episodeNumber: episode.episodeNumber + index + 1,
            seasonNumber: episode.seasonNumber,
          })),
        )) as unknown as TVEpisode[];

        await map(newEpisodes, ({ id }) => {
          this.jobsService.startDownloadEpisode(id);
        });
      }
    });

    this.logger.info("finish find new tsvhow episodes");
  }

  public scanLibrary() {
    this.scanLibraryQueue.add(
      ScanLibraryQueueProcessors.SCAN_MOVIES_FOLDER,
      {},
    );

    this.scanLibraryQueue.add(
      ScanLibraryQueueProcessors.SCAN_TV_SHOWS_FOLDER,
      {},
    );
  }

  /**
   * Replaces processed H.264 files with a smaller HEVC/x265 release.
   *
   * Destructive by design (the existing download flow frees the old file when
   * the replacement starts), so it only runs on explicit request and only when
   * an acceptable x265 release is strictly smaller than the media it replaces.
   */
  public async replaceH264Media() {
    const ignoreH264 =
      (await this.paramsService.get(ParameterKey.IGNORE_H264_RELEASES)) ===
      "true";

    if (!ignoreH264) {
      this.logger.warn(
        "replace h264 skipped: ignore_h264_releases is disabled",
      );
      return { replaced: 0, savedBytes: 0 };
    }

    const targets = await this.getProcessedMediaTargets();

    this.logger.info(`scanning ${targets.length} processed media for h264`);

    let replacementsStarted = 0;
    const outcomes = await mapConcurrent<UpgradeTarget, UpgradeOutcome>(
      targets,
      2,
      async (target) => {
        if (replacementsStarted >= MAX_REPLACEMENTS_PER_RUN) {
          return { status: "skipped" };
        }
        const outcome = await this.replaceH264Target(target);
        if (outcome.status === "replaced") replacementsStarted += 1;
        return outcome;
      },
    );

    const replaced = outcomes.filter(
      (outcome) => outcome.status === "replaced",
    );
    const failed = outcomes.filter((outcome) => outcome.status === "failed");
    const savedBytes = replaced.reduce(
      (total, outcome) => total + (outcome.savedBytes ?? 0),
      0,
    );

    this.logger.info("finish h264 replacement", {
      scanned: targets.length,
      replaced: replaced.length,
      skipped: outcomes.length - replaced.length - failed.length,
      failed: failed.length,
      cap: MAX_REPLACEMENTS_PER_RUN,
      savedBytes,
    });

    return { replaced: replaced.length, savedBytes };
  }

  private async getProcessedMediaTargets(): Promise<UpgradeTarget[]> {
    const movies = await this.movieDAO.find({
      where: { state: DownloadableMediaState.PROCESSED },
      relations: ["files"],
    });
    const episodes = await this.tvEpisodeDAO.find({
      where: { state: DownloadableMediaState.PROCESSED },
      relations: ["files", "tvShow"],
    });

    return [
      ...movies.map((movie) => ({
        kind: "movie" as const,
        id: movie.id,
        label: movie.title,
        qualityId: movie.qualityId,
        files: (movie.files ?? []).map((file) => file.path),
      })),
      ...episodes.map((episode) => ({
        kind: "episode" as const,
        id: episode.id,
        label: `${episode.tvShow?.title ?? "TV"} S${formatNumber(
          episode.seasonNumber,
        )}E${formatNumber(episode.episodeNumber)}`,
        qualityId: episode.tvShow?.qualityId ?? null,
        files: (episode.files ?? []).map((file) => file.path),
      })),
    ];
  }

  /**
   * Replaces processed media whose audio is foreign-only, using the same
   * stream-tag + embedded-release-title detection as the post-download guard.
   * Unknown audio is left alone; only positively foreign files are replaced.
   */
  public async replaceForeignAudioMedia() {
    const requireEnglishAudio =
      (await this.paramsService.get(
        ParameterKey.REQUIRE_ENGLISH_AUDIO,
      )) === "true";

    if (!requireEnglishAudio) {
      this.logger.warn(
        "replace foreign audio skipped: require_english_audio is disabled",
      );
      return { replaced: 0 };
    }

    const targets = await this.getProcessedMediaTargets();
    this.logger.info(
      `scanning ${targets.length} processed media for foreign audio`,
    );

    let replacementsStarted = 0;
    const outcomes = await mapConcurrent<UpgradeTarget, UpgradeOutcome>(
      targets,
      2,
      async (target) => {
        if (replacementsStarted >= MAX_REPLACEMENTS_PER_RUN) {
          return { status: "skipped" };
        }
        const outcome = await this.replaceForeignAudioTarget(target);
        if (outcome.status === "replaced") replacementsStarted += 1;
        return outcome;
      },
    );

    const replaced = outcomes.filter(
      (outcome) => outcome.status === "replaced",
    );
    const failed = outcomes.filter((outcome) => outcome.status === "failed");

    this.logger.info("finish foreign-audio replacement", {
      scanned: targets.length,
      replaced: replaced.length,
      skipped: outcomes.length - replaced.length - failed.length,
      failed: failed.length,
      cap: MAX_REPLACEMENTS_PER_RUN,
    });

    return { replaced: replaced.length };
  }

  private async replaceForeignAudioTarget(
    target: UpgradeTarget,
  ): Promise<UpgradeOutcome> {
    try {
      const detected = await this.targetHasForeignAudio(target);
      if (!detected) return { status: "skipped" };

      if (detected.releaseTitle) {
        try {
          await this.redisService.addRejectedTitle(
            normalizeReleaseTitle(detected.releaseTitle),
          );
        } catch (error) {
          this.logger.warn("failed to blocklist foreign-audio release", {
            label: target.label,
            error: error instanceof Error ? error.message : error,
          });
        }
      }

      const quality = target.qualityId
        ? (await this.paramsService.getQualityById(target.qualityId))?.name
        : undefined;

      const results =
        target.kind === "movie"
          ? await this.jackettService.searchMovie(target.id, quality)
          : await this.jackettService.searchEpisode(target.id, quality);

      const candidate = results[0];
      if (!candidate) {
        this.logger.info("no English-audio replacement found", {
          label: target.label,
          files: detected.files,
        });
        return { status: "skipped" };
      }

      const jackettInput = {
        title: candidate.title,
        downloadLink: candidate.downloadLink,
        tag: candidate.tag.label,
        quality: candidate.quality.label,
      };

      if (target.kind === "movie") {
        await this.libraryDownloadService.downloadMovie(
          target.id,
          jackettInput,
          null,
        );
      } else {
        await this.libraryDownloadService.downloadTVEpisode(
          target.id,
          jackettInput,
          null,
        );
      }

      this.logger.info("queued foreign-audio replacement", {
        label: target.label,
        release: candidate.title,
        files: detected.files,
      });

      return { status: "replaced" };
    } catch (error) {
      this.logger.error("foreign-audio replacement failed", {
        label: target.label,
        error: error instanceof Error ? error.message : error,
      });
      return { status: "failed" };
    }
  }

  private async targetHasForeignAudio(
    target: UpgradeTarget,
  ): Promise<{ releaseTitle?: string; files: string[] } | null> {
    const videoFiles = target.files.filter(
      (file) => VIDEO_FILE.test(file) && !/sample/i.test(file),
    );
    if (videoFiles.length === 0) return null;

    const probes = await mapConcurrent(videoFiles, 3, async (file) => {
      const probe = await probeAudio(file);
      return { file, probe, assessment: assessAudio(probe) };
    });

    const foreign = probes.filter(
      (item) => item.assessment === "foreign",
    );
    if (foreign.length === 0) return null;

    return {
      releaseTitle: foreign[0].probe?.releaseTitle,
      files: foreign.map((item) => item.file),
    };
  }

  private async replaceH264Target(
    target: UpgradeTarget,
  ): Promise<UpgradeOutcome> {
    try {
      const videoFiles = target.files.filter((file) => VIDEO_FILE.test(file));
      if (videoFiles.length === 0) return { status: "skipped" };

      const stats = await Promise.all(
        videoFiles.map(async (file) => {
          const stat = await fs.stat(file).catch(() => null);
          return { file, size: stat?.size ?? 0 };
        }),
      );
      const totalSize = stats.reduce((total, item) => total + item.size, 0);
      const largest = stats.reduce(
        (result, item) => (item.size > result.size ? item : result),
        stats[0],
      );

      if (!largest || largest.size === 0) return { status: "skipped" };

      const codec = await probeVideoCodec(largest.file);
      if (!isH264Codec(codec)) return { status: "skipped" };

      const quality = target.qualityId
        ? (await this.paramsService.getQualityById(target.qualityId))?.name
        : undefined;

      const results =
        target.kind === "movie"
          ? await this.jackettService.searchMovie(target.id, quality, true)
          : await this.jackettService.searchEpisode(target.id, quality, true);

      const candidate = pickSmallestH265Upgrade(results, totalSize);
      if (!candidate) {
        this.logger.info("no smaller x265 release found", {
          label: target.label,
          totalSize,
        });
        return { status: "skipped" };
      }

      const jackettInput = {
        title: candidate.title,
        downloadLink: candidate.downloadLink,
        tag: candidate.tag.label,
        quality: candidate.quality.label,
      };

      if (target.kind === "movie") {
        await this.libraryDownloadService.downloadMovie(
          target.id,
          jackettInput,
          null,
        );
      } else {
        await this.libraryDownloadService.downloadTVEpisode(
          target.id,
          jackettInput,
          null,
        );
      }

      this.logger.info("queued h264 replacement", {
        label: target.label,
        release: candidate.title,
        savedBytes: totalSize - candidate.size,
      });

      return { status: "replaced", savedBytes: totalSize - candidate.size };
    } catch (error) {
      this.logger.error("h264 replacement failed", {
        label: target.label,
        error: error instanceof Error ? error.message : error,
      });
      return { status: "failed" };
    }
  }

  public async scanMoviesFolder() {
    const { movies: moviesFolderName } =
      await this.libraryFoldersService.getFolderNames();
    const mount = await this.libraryFoldersService.getMountForType('movies');
    const mounts = [mount];

    for (const mount of mounts) {
      const root = path.join(mount.path, moviesFolderName);
      this.logger.info("start scan movies folder", {
        folderName: moviesFolderName,
        mountPath: mount.path,
      });

      let movies: string[];
      try {
        movies = (await fs.readdir(root, { withFileTypes: true }))
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
      } catch (error) {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.logger.info("movies folder not present on mount, skipping", {
            mountPath: mount.path,
          });
          continue;
        }
        throw error;
      }

      this.logger.info(`found ${movies.length} movies on disk`, {
        mountPath: mount.path,
      });

      await mapConcurrent(movies, LIBRARY_CONFIG.scanConcurrency, (movie) =>
        this.scanLibraryQueue.add(
          ScanLibraryQueueProcessors.PROCESS_MOVIE_FOLDER,
          { movie, mountId: mount.id },
        ),
      );

      this.logger.info("finish scan movies folder", {
        mountPath: mount.path,
      });
    }
  }

  public async scanTVShowsFolder() {
    const { tvshows: tvShowsFolderName } =
      await this.libraryFoldersService.getFolderNames();
    const mount = await this.libraryFoldersService.getMountForType('tvshows');
    const mounts = [mount];

    for (const mount of mounts) {
      const root = path.join(mount.path, tvShowsFolderName);
      this.logger.info("start scan tvshows folder", {
        folderName: tvShowsFolderName,
        mountPath: mount.path,
      });

      let tvshows: string[];
      try {
        tvshows = (await fs.readdir(root, { withFileTypes: true }))
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
      } catch (error) {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.logger.info("tvshows folder not present on mount, skipping", {
            mountPath: mount.path,
          });
          continue;
        }
        throw error;
      }

      this.logger.info(`found ${tvshows.length} tvshows on disk`, {
        mountPath: mount.path,
      });

      await mapConcurrent(tvshows, LIBRARY_CONFIG.scanConcurrency, (tvshow) =>
        this.scanLibraryQueue.add(
          ScanLibraryQueueProcessors.PROCESS_TV_SHOW_FOLDER,
          { tvshow, mountId: mount.id },
        ),
      );

      this.logger.info("finish scan tvshows folder", {
        mountPath: mount.path,
      });
    }
  }

  @Transaction()
  public async processMovieFolder(
    { data: { movie, mountId } }: Job<{ movie: string; mountId?: number }>,
    @TransactionManager() manager?: EntityManager,
  ) {
    this.logger.info("processing movie", { movie });

    const movieDAO = MovieDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);

    const { movies: moviesFolderName } =
      await this.libraryFoldersService.getFolderNames();
    const mounts = mountId
      ? [await this.mediaMountsService.findOne(mountId)].filter(
          (mount): mount is NonNullable<typeof mount> => Boolean(mount),
        )
      : await this.mediaMountsService.getWritableMounts();

    let movieFolder: string | null = null;
    for (const mount of mounts) {
      const candidate = path.join(mount.path, moviesFolderName, movie);
      try {
        const stats = await fs.stat(candidate);
        if (stats.isDirectory()) {
          movieFolder = candidate;
          break;
        }
      } catch {
        // not on this mount, try next
      }
    }

    if (!movieFolder) {
      this.logger.warn("movie folder not found on any mount", { movie });
      return;
    }

    const movieFiles = (await fs.readdir(movieFolder, { withFileTypes: true }))
      .filter((dirent) => dirent.isFile() || dirent.isSymbolicLink())
      .map((dirent) => dirent.name);

    const files = await mapSeries(movieFiles, async (file) => {
      const match = await fileDAO.findOne({
        where: { path: path.join(movieFolder!, file) },
        relations: ["movie"],
      });
      return { match, file: path.join(movieFolder!, file) };
    });

    const movieInDatabase = files.find((file) => file.match?.movie);
    const untrackedFiles = files.filter((file) => !file.match);

    if (movieInDatabase) {
      this.logger.info("movie already tracked in library", { untrackedFiles });

      await forEachSeries(untrackedFiles, ({ file }) =>
        fileDAO.save({ path: file, movieId: movieInDatabase.match?.id }),
      );

      return;
    }

    const [, title, year] = /^(.+) \((\d+)/.exec(movie) || [];

    if (!title || !year) {
      throw new Error(`cant parse movie name or year [${movie}]`);
    }

    this.logger.info("parsed filename", { title, year });

    const matchByTitle = await movieDAO.findOne({
      where: { title },
    });

    if (matchByTitle) {
      this.logger.info("movie already in database", { title, year });

      await forEachSeries(untrackedFiles, ({ file }) =>
        fileDAO.save({ path: file, movieId: matchByTitle.id }),
      );

      return;
    }

    const localizedResults = await this.tmdbService.searchMovie(title);
    const englishResults = await this.tmdbService.searchMovie(title, {
      language: "en",
    });

    const results = [...localizedResults, ...englishResults];
    this.logger.info(`found ${results.length} potential match on tmdb`);

    const tmdbMovie = (() => {
      const [exactMatch] = results.filter(
        (result) =>
          dayjs(result.releaseDate).format("YYYY") === year &&
          (sanitize(title) === sanitize(result.title) ||
            sanitize(title) === sanitize(result.originalTitle)),
      );

      if (exactMatch) {
        return exactMatch;
      }

      this.logger.warn("could not find exact match movie");
      this.logger.warn("fallback to year match and levenstein");

      const [bestMatch] = orderBy(
        results.filter(
          (result) => dayjs(result.releaseDate).format("YYYY") === year,
        ),
        [(result) => leven(result.title, title)],
        ["asc"],
      );

      if (bestMatch) {
        this.logger.warn(`best guessed match for ${title}`);
        this.logger.warn(bestMatch.title);
        return bestMatch;
      }

      return undefined;
    })();

    if (!tmdbMovie) {
      this.logger.error("no movie found matching title and year for");
      this.logger.error(`${title} (${year})`);
      return;
    }

    this.logger.info("found movie on tmdb", { tmdbId: tmdbMovie.tmdbId });

    const match = await movieDAO.findOne({
      where: { tmdbId: tmdbMovie.tmdbId },
    });

    if (match) {
      this.logger.info("movie already in library", {
        tmdbId: tmdbMovie.tmdbId,
      });

      await forEachSeries(untrackedFiles, ({ file }) =>
        fileDAO.save({ path: file, movieId: match.id }),
      );
    } else {
      const newMovie = await movieDAO.save({
        title,
        tmdbId: tmdbMovie.id,
        state: DownloadableMediaState.PROCESSED,
      });

      await forEachSeries(untrackedFiles, ({ file }) =>
        fileDAO.save({ path: file, movieId: newMovie.id }),
      );

      this.logger.info("new movie saved in database", {
        tmdbId: tmdbMovie.tmdbId,
      });
    }
  }

  @Transaction()
  public async processTVShow(
    { data: { tvshow, mountId } }: Job<{ tvshow: string; mountId?: number }>,
    @TransactionManager() manager?: EntityManager,
  ) {
    this.logger.info("start processing tvshow", { tvshow });

    const tvShowDAO = TVShowDAO.fromManager(manager!);
    const tvSeasonDAO = TVSeasonDAO.fromManager(manager!);
    const tvEpisodeDAO = TVEpisodeDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);

    const isTVShowInDatabase = await fileDAO.findOne({
      where: { path: Like(`%${tvshow}%`), movieId: IsNull() },
      relations: ["tvEpisode", "tvEpisode.tvShow"],
    });

    let tvShow = isTVShowInDatabase
      ? isTVShowInDatabase?.tvEpisode?.tvShow
      : null;

    if (!tvShow) {
      const [tmdbResult] = await this.tmdbService.searchTVShow(tvshow, {
        language: "en",
      });

      if (!tmdbResult) {
        this.logger.error("tvshow not found on tmdb", { tvshow });
        return;
      }

      this.logger.info("tvshow found on tmdb", { tmdbId: tmdbResult.tmdbId });

      tvShow = await tvShowDAO.findOrCreate({
        tmdbId: tmdbResult.tmdbId,
        title: tvshow,
      });
    }

    const { tvshows: tvShowsFolderName } =
      await this.libraryFoldersService.getFolderNames();
    const mounts = mountId
      ? [await this.mediaMountsService.findOne(mountId)].filter(
          (mount): mount is NonNullable<typeof mount> => Boolean(mount),
        )
      : await this.mediaMountsService.getWritableMounts();

    let showRoot: string | null = null;
    for (const mount of mounts) {
      const candidate = path.join(mount.path, tvShowsFolderName, tvshow);
      try {
        const stats = await fs.stat(candidate);
        if (stats.isDirectory()) {
          showRoot = candidate;
          break;
        }
      } catch {
        // not on this mount, try next
      }
    }

    if (!showRoot) {
      this.logger.warn("tvshow folder not found on any mount", { tvshow });
      return;
    }

    // Walk recursively so release subfolders (e.g.
    // `Show/Show.Complete.S01-S07.../Season 1/file.mkv`) are found too.
    const episodes: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          episodes.push(full);
        }
      }
    };
    await walk(showRoot);

    const touchedSeasonIds = new Set<number>();

    await forEachSeries(episodes, async (episodePath) => {
      const basename = path.basename(episodePath);
      if (basename.startsWith(".")) {
        return;
      }

      this.logger.info(`start processing episode`, {
        episode: basename,
      });

      const parsed = parseTvFile(episodePath, showRoot);

      if (!parsed) {
        this.logger.error("could not parse season/episode number", {
          episode: basename,
        });
        return;
      }

      const { seasonNumber, episodeNumbers } = parsed;

      this.logger.info(`found season number and episode`, {
        seasonNumber,
        episodeNumbers,
      });

      const tvSeason = await tvSeasonDAO.findOrCreate(
        {
          tvShowId: tvShow!.id,
          seasonNumber,
        },
        DownloadableMediaState.PROCESSED,
      );
      touchedSeasonIds.add(tvSeason.id);

      const linkedEpisodes = await mapSeries(episodeNumbers, (episodeNumber) =>
        tvEpisodeDAO.findOrCreate({
          tvShowId: tvShow!.id,
          seasonId: tvSeason.id,
          episodeNumber,
          seasonNumber,
        }),
      );

      await tvEpisodeDAO.save(
        linkedEpisodes.map((episode) => ({
          id: episode.id,
          state: DownloadableMediaState.PROCESSED,
          season: tvSeason,
        })),
      );

      // File paths are unique, so a multi-episode file is linked to its
      // first episode while every episode in the range is still marked
      // processed (which is what season counts are derived from).
      const file = await fileDAO.findOne({ where: { path: episodePath } });

      if (file) {
        this.logger.info(`episode already tracked, skip`);
        return;
      }

      await fileDAO.save({
        path: episodePath,
        tvEpisodeId: linkedEpisodes[0].id,
      });
    });

    await forEachSeries([...touchedSeasonIds], async (seasonId) => {
      const season = await tvSeasonDAO.findOne({
        where: { id: seasonId },
        relations: ["episodes"],
      });
      const seasonEpisodes = season?.episodes ?? [];
      if (
        season &&
        seasonEpisodes.length > 0 &&
        seasonEpisodes.every(
          (episode) =>
            episode.state === DownloadableMediaState.DOWNLOADED ||
            episode.state === DownloadableMediaState.PROCESSED,
        ) &&
        season.state !== DownloadableMediaState.PROCESSED
      ) {
        await tvSeasonDAO.save({
          id: season.id,
          state: DownloadableMediaState.PROCESSED,
        });
      }
    });

    this.logger.info("finish processing tvshow", { tvshow });
  }
}
