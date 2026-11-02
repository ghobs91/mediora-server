import { Injectable, Inject } from "@nestjs/common";
import { map, mapSeries } from "p-iteration";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import dayjs from "dayjs";
import { Any } from "typeorm";

import { FileType, DownloadableMediaState } from "src/app.dto";
import { MovieDAO } from "src/entities/dao/movie.dao";
import { Movie } from "src/entities/movie.entity";
import { TorrentDAO } from "src/entities/dao/torrent.dao";
import { TVShowDAO } from "src/entities/dao/tvshow.dao";
import { TVEpisodeDAO } from "src/entities/dao/tvepisode.dao";
import { MediaViewDAO } from "src/entities/dao/media-view.dao";
import { TVShow } from "src/entities/tvshow.entity";
import { TVEpisode } from "src/entities/tvepisode.entity";
import { TMDBService } from "src/modules/tmdb/tmdb.service";
import { TransmissionService } from "src/modules/transmission/transmission.service";
import { mapConcurrent } from "src/utils/map-concurrent";

const ENRICH_CONCURRENCY = 8;

type EnrichedMovieRow = ReturnType<TMDBService["mapMovie"]> & Movie;
type EnrichedTVShowRow = ReturnType<TMDBService["mapTVShow"]> &
  TVShow & {
    runtime?: number;
    episodesDownloaded: number;
    episodesTotal: number;
  };

@Injectable()
export class LibraryQueryService {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly movieDAO: MovieDAO,
    private readonly tvShowDAO: TVShowDAO,
    private readonly tvEpisodeDAO: TVEpisodeDAO,
    private readonly tmdbService: TMDBService,
    private readonly mediaViewDAO: MediaViewDAO,
    private readonly torrentDAO: TorrentDAO,
    private readonly transmissionService: TransmissionService,
  ) {
    this.logger = logger.child({ context: "LibraryQueryService" });
  }

  public async getDownloading() {
    const downloading = await this.mediaViewDAO.find({
      order: { id: "ASC" },
      where: { state: DownloadableMediaState.DOWNLOADING },
    });
    const withTorrentQuality = await map(downloading, async (resource) => {
      try {
        const resourceTorrent =
          await this.transmissionService.getResourceTorrent({
            resourceId: resource.resourceId,
            resourceType: resource.resourceType,
          });

        if (!resourceTorrent?.transmissionTorrent) return null;

        const { tag, quality, transmissionTorrent } = resourceTorrent;
        return { ...resource, tag, quality, torrent: transmissionTorrent.name };
      } catch (error) {
        // A missing torrent row or a Transmission blip must not fail the whole list.
        this.logger.warn('failed to resolve torrent for downloading media', {
          resourceId: resource.resourceId,
          resourceType: resource.resourceType,
          error: error instanceof Error ? error.message : error,
        });
        return null;
      }
    });
    return withTorrentQuality.filter(Boolean);
  }

  public async getSearching() {
    const searching = await this.mediaViewDAO.find({
      where: { state: DownloadableMediaState.SEARCHING },
    });
    const downloadingSeasons = await this.mediaViewDAO.find({
      where: {
        state: Any([
          DownloadableMediaState.DOWNLOADING,
          DownloadableMediaState.SEARCHING,
        ]),
        resourceType: FileType.SEASON,
      },
    });
    return searching.filter((row) =>
      row.resourceType === FileType.EPISODE
        ? !downloadingSeasons.some((season) => row.title.includes(season.title))
        : true,
    );
  }

  public async getMovies() {
    const movies = await this.movieDAO.find({ order: { createdAt: "DESC" } });
    return mapConcurrent(movies, ENRICH_CONCURRENCY, this.enrichMovie);
  }

  public async getMovie(movieId: number) {
    return this.enrichMovie(
      await this.movieDAO.findOneOrFail({ where: { id: movieId } }),
    );
  }

  public async getTVShows() {
    const tvShows = await this.tvShowDAO.find({ order: { createdAt: "ASC" } });
    return mapConcurrent(tvShows, ENRICH_CONCURRENCY, (tvShow) =>
      this.enrichTVShow(tvShow),
    );
  }

  public async getTVShow(tvShowId: number, params?: { language: string }) {
    return this.enrichTVShow(
      await this.tvShowDAO.findOneOrFail({ where: { id: tvShowId } }),
      params,
    );
  }

  public async findMissingTVEpisodes() {
    const episodes = await this.tvEpisodeDAO.findMissingFromLibrary();
    return mapConcurrent(episodes, ENRICH_CONCURRENCY, this.enrichTVEpisode);
  }

  public async findMissingMovies() {
    const movies = await this.movieDAO.find({
      where: { state: DownloadableMediaState.MISSING },
    });
    return mapConcurrent(movies, ENRICH_CONCURRENCY, this.enrichMovie);
  }

  public async calendar() {
    const movies = await mapSeries(
      await this.movieDAO.find(),
      this.enrichMovie,
    );
    const tvEpisodes = await mapSeries(
      await this.tvEpisodeDAO.find({ relations: ["tvShow"] }),
      this.enrichTVEpisode,
    );
    return { movies, tvEpisodes };
  }

  public async getMovieFileDetails(tmdbId: number) {
    const movie = await this.movieDAO
      .findOneOrFail({ where: { tmdbId } })
      .then(this.enrichMovie);
    const torrentEntity = await this.torrentDAO.findOne({
      where: { resourceType: FileType.MOVIE, resourceId: movie.id },
    });
    const transmissionTorrent = torrentEntity
      ? await this.transmissionService.getTorrent(torrentEntity.torrentHash)
      : null;
    const year = dayjs(movie.releaseDate).format("YYYY");
    return {
      id: tmdbId,
      libraryPath: `library/movies/${movie.title} (${year})`,
      libraryFileSize: transmissionTorrent?.totalSize,
      torrentFileName: transmissionTorrent?.name,
    };
  }

  public async getTVSeasonDetails({
    tvShowTMDBId,
    seasonNumber,
  }: {
    tvShowTMDBId: number;
    seasonNumber: number;
  }) {
    const episodes = await this.tvEpisodeDAO
      .createQueryBuilder("episode")
      .innerJoinAndSelect(
        "episode.tvShow",
        "tvShow",
        "tvShow.tmdbId = :tvShowTMDBId",
        { tvShowTMDBId },
      )
      .where("episode.seasonNumber = :seasonNumber", { seasonNumber })
      .orderBy("episode.episodeNumber")
      .getMany();
    return mapConcurrent(episodes, ENRICH_CONCURRENCY, this.enrichTVEpisode);
  }

  /**
   * Enrichment is a best-effort overlay on top of the local database: if TMDB
   * is unreachable the row is still returned with empty metadata, so library
   * and detail queries keep working.
   */
  private enrichMovie = async (movie: Movie): Promise<EnrichedMovieRow> => {
    const tmdb = await this.tmdbService.getMovieSafe(movie.tmdbId);

    if (!tmdb) {
      return {
        ...movie,
        overview: "",
        voteAverage: 0,
        releaseDate: "",
        runtime: 0,
        originalTitle: movie.title,
        originCountry: [],
        posterPath: "",
      };
    }

    const tmdbResult = this.tmdbService.mapMovie(tmdb);
    return {
      ...tmdbResult,
      ...movie,
      title: tmdbResult.title || movie.title,
      overview: tmdbResult.overview ?? "",
      voteAverage: tmdbResult.voteAverage ?? 0,
      releaseDate: tmdbResult.releaseDate ?? "",
    };
  };

  private enrichTVShow = async (
    tvShow: TVShow,
    params?: { language: string },
  ): Promise<EnrichedTVShowRow> => {
    const tmdb = await this.tmdbService.getTVShowSafe(tvShow.tmdbId, params);

    const episodes = await this.tvEpisodeDAO.find({
      where: { tvShowId: tvShow.id },
    });
    const episodesTotal = episodes.length;
    const episodesDownloaded = episodes.filter(
      (episode) =>
        episode.state === DownloadableMediaState.DOWNLOADED ||
        episode.state === DownloadableMediaState.PROCESSED,
    ).length;

    if (!tmdb) {
      return {
        ...tvShow,
        overview: "",
        voteAverage: 0,
        releaseDate: "",
        runtime: 0,
        originalTitle: tvShow.title,
        originCountry: [],
        posterPath: "",
        episodesDownloaded,
        episodesTotal,
      };
    }

    const tmdbResult = this.tmdbService.mapTVShow(tmdb);
    return {
      ...tmdbResult,
      ...tvShow,
      title: tmdbResult.title || tvShow.title,
      overview: tmdbResult.overview ?? "",
      voteAverage: tmdbResult.voteAverage ?? 0,
      releaseDate: tmdbResult.releaseDate ?? "",
      episodesDownloaded,
      episodesTotal,
    };
  };

  private enrichTVEpisode = async (tvEpisode: TVEpisode) => {
    const tmdb = await this.tmdbService.getTVEpisodeSafe(
      tvEpisode.tvShow.tmdbId,
      tvEpisode.seasonNumber,
      tvEpisode.episodeNumber,
    );
    return { ...tvEpisode, releaseDate: tmdb?.air_date ?? "" };
  };
}
