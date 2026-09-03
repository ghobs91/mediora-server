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
} from "src/app.dto";

import { sanitize } from "src/utils/sanitize";

import { JobsService } from "src/modules/jobs//jobs.service";
import { TMDBService } from "src/modules/tmdb/tmdb.service";

import { MovieDAO } from "src/entities/dao/movie.dao";
import { TVShowDAO } from "src/entities/dao/tvshow.dao";
import { TVEpisodeDAO } from "src/entities/dao/tvepisode.dao";
import { TVEpisode } from "src/entities/tvepisode.entity";
import { TVSeasonDAO } from "src/entities/dao/tvseason.dao";
import { FileDAO } from "src/entities/dao/file.dao";
import { LibraryFoldersService } from "src/modules/library/library-folders.service";
import { MediaMountsService } from "src/modules/library/media-mounts.service";

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

    await forEachSeries(episodes, async (episodePath) => {
      if (
        // skip non-video files
        episodePath.endsWith(".srt") ||
        episodePath.endsWith(".nfo") ||
        episodePath.startsWith(".")
      ) {
        return;
      }

      this.logger.info(`start processing episode`, {
        episode: path.basename(episodePath),
      });

      const file = await fileDAO.findOne({ where: { path: episodePath } });

      if (file) {
        this.logger.info(`episode already tracked, skip`);
        return;
      }

      const season = path.dirname(episodePath);
      const seasonNumber =
        /season\s*(\d+)/i.exec(episodePath)?.[1] ?? /\d+/.exec(season)?.[0];

      if (!seasonNumber) {
        this.logger.error("could not parse season number", {
          season,
          seasonNumber,
        });
        return;
      }

      // parse episode number from title (S01E01, 1x01, case-insensitive)
      const [, episodeNumber] =
        /E(\d+)/i.exec(episodePath) || /\d+[xX](\d+)/.exec(episodePath) || [];

      if (!episodeNumber) {
        this.logger.error("could not parse episode number", {
          episode: path.basename(episodePath),
        });
        return;
      }

      this.logger.info(`found season number and episode`, {
        seasonNumber,
        episodeNumber,
      });

      const tvSeason = await tvSeasonDAO.findOrCreate(
        {
          tvShowId: tvShow!.id,
          seasonNumber: parseInt(seasonNumber, 10),
        },
        DownloadableMediaState.PROCESSED,
      );

      const episode = await tvEpisodeDAO.findOrCreate({
        tvShowId: tvShow!.id,
        seasonId: tvSeason.id,
        episodeNumber: parseInt(episodeNumber, 10),
        seasonNumber: parseInt(seasonNumber, 10),
      });

      await tvEpisodeDAO.save({
        id: episode.id,
        state: DownloadableMediaState.PROCESSED,
        season: tvSeason,
      });

      await fileDAO.save({
        path: episodePath,
        tvEpisodeId: episode.id,
      });
    });

    this.logger.info("finish processing tvshow", { tvshow });
  }
}
