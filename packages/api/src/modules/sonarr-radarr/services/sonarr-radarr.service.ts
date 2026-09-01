import { Injectable, NotFoundException } from '@nestjs/common';

import { FileType } from 'src/app.dto';
import { TMDBService } from 'src/modules/tmdb/tmdb.service';
import { TransmissionService } from 'src/modules/transmission/transmission.service';
import { LibraryQueryService } from 'src/modules/library/library-query.service';
import { EnrichedMovie, EnrichedTVShow } from 'src/modules/library/library.dto';
import { isAvailable } from '../mappers/media-mapper';
import { LibraryOrganizationService } from 'src/modules/library/library-organization.service';
import { MediaMountsService } from 'src/modules/library/media-mounts.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { MediaMount, MediaMountState } from 'src/entities/media-mount.entity';
import { Torrent } from 'src/entities/torrent.entity';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';
import { Movie } from 'src/entities/movie.entity';
import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';
import { FileDAO } from 'src/entities/dao/file.dao';

import { RadarrMovie, RadarrQueueItem } from '../dto/radarr.dto';
import { SonarrQueueItem, SonarrSeries } from '../dto/sonarr.dto';
import {
  SonarrV3Series,
  SonarrV3Season,
  SonarrV3Episode,
  SonarrV3EpisodeFile,
  SonarrV3QueueItem,
  SonarrV3RootFolder,
  SonarrV3QualityProfile,
  SonarrV3SystemStatus,
  RadarrV3Movie,
  RadarrV3QueueItem,
} from '../dto/v3.dto';
import { MediaMapper, getFreeSpace } from '../mappers/media-mapper';

interface TransmissionTorrent {
  hashString: string;
  name: string;
  percentDone: number;
  leftUntilDone: number;
  totalSize: number;
  rateDownload: number;
  eta: number;
  status: number;
  activityDate: number;
  addedDate: number;
  doneDate: number;
}

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

@Injectable()
export class SonarrRadarrService {
  public constructor(
    private readonly tmdbService: TMDBService,
    private readonly transmissionService: TransmissionService,
    private readonly libraryQueryService: LibraryQueryService,
    private readonly libraryOrganizationService: LibraryOrganizationService,
    private readonly mediaMountsService: MediaMountsService,
    private readonly jobsService: JobsService,
    private readonly mapper: MediaMapper,
    private readonly torrentDAO: TorrentDAO,
    private readonly movieDAO: MovieDAO,
    private readonly seasonDAO: TVSeasonDAO,
    private readonly episodeDAO: TVEpisodeDAO,
    private readonly tvShowDAO: TVShowDAO,
    private readonly fileDAO: FileDAO,
  ) {}

  public async getSystemStatus(): Promise<{ version: string }> {
    return { version: '3.0.10.1893' };
  }

  public async getRootFolders(): Promise<MediaMount[]> {
    return this.mediaMountsService.findAll();
  }

  public async getMovies(): Promise<RadarrMovie[]> {
    const movies = await this.libraryQueryService.getMovies();
    const rootFolders = await this.getRootFolders();

    return Promise.all(
      movies.map((movie) =>
        this.mapper.mapMovie(
          movie as unknown as EnrichedMovie,
          rootFolders,
        ),
      ),
    );
  }

  public async getMovie(id: string): Promise<RadarrMovie> {
    const movie = await this.libraryQueryService.getMovie(Number(id));

    return this.mapper.mapMovie(
      movie as unknown as EnrichedMovie,
      await this.getRootFolders(),
    );
  }

  public async getMovieById(id: string): Promise<RadarrMovie> {
    const movie = await this.movieDAO.findOne({
      where: { id: Number(id) },
      relations: [],
    });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return this.mapper.mapMovie(
      await this.libraryQueryService.getMovie(movie.tmdbId) as unknown as EnrichedMovie,
      await this.getRootFolders(),
    );
  }

  public async getMovieQueue(): Promise<RadarrQueueItem[]> {
    const torrents = await this.torrentDAO.find({
      where: { resourceType: FileType.MOVIE },
      order: { createdAt: 'DESC' },
      take: 100,
      relations: [],
    });

    if (torrents.length === 0) {
      return [];
    }

    const movieIds = torrents.map((torrent) => torrent.resourceId);
    const movies = await this.movieDAO.find({
      where: movieIds.map((id) => ({ id })),
      relations: [],
    });
    const movieMap = new Map(movies.map((movie) => [movie.id, movie]));

    const items = await Promise.all(
      torrents.map(async (torrent) => {
        const transmission = await this.getTransmissionTorrent(torrent);

        if (!transmission) {
          return null;
        }

        const movie = movieMap.get(torrent.resourceId) as Movie | undefined;

        return this.mapper.mapQueueItem(torrent, transmission, {
          movieId: torrent.resourceId,
          movieTmdbId: movie?.tmdbId,
          title: movie?.title ?? '',
        });
      }),
    );

    return items.filter((item: RadarrQueueItem | null): item is RadarrQueueItem => item !== null);
  }

  public async addMovie(
    payload: { tmdbId: string; title?: string },
  ): Promise<RadarrMovie> {
    await this.libraryOrganizationService.trackMovie({
      tmdbId: Number(payload.tmdbId),
      title: payload.title,
    });

    return this.mapper.mapMovie(
      (await this.libraryQueryService.getMovie(Number(payload.tmdbId))) as unknown as EnrichedMovie,
      await this.getRootFolders(),
    );
  }

  public async removeMovie(id: string, deleteFiles: boolean): Promise<void> {
    const movie = await this.movieDAO.findOne({
      where: { id: Number(id) },
      relations: [],
    });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    await this.libraryOrganizationService.removeMovie(
      { tmdbId: movie.tmdbId, softDelete: !deleteFiles },
      null,
    );
  }

  public async getSeries(id: string): Promise<SonarrSeries> {
    const show = await this.libraryQueryService.getTVShow(Number(id));

    return this.buildSeries(
      show as unknown as EnrichedTVShow,
      Number(id),
      await this.getRootFolders(),
    );
  }

  public async getSeriesList(): Promise<SonarrSeries[]> {
    const shows = await this.libraryQueryService.getTVShows();
    const rootFolders = await this.getRootFolders();

    return Promise.all(
      shows.map((show) =>
        this.buildSeries(
          show as unknown as EnrichedTVShow,
          show.id,
          rootFolders,
        ),
      ),
    );
  }

  private async buildSeries(
    show: EnrichedTVShow,
    tvShowId: number,
    rootFolders: MediaMount[],
  ): Promise<SonarrSeries> {
    const seasons = await this.seasonDAO.find({
      where: { tvShowId },
      relations: ['episodes'],
      order: { seasonNumber: 'ASC' },
    });
    const episodeIds = seasons.flatMap((season) =>
      (season.episodes ?? []).map((episode) => episode.id),
    );
    const episodes = await this.episodeDAO.find({
      where: episodeIds.map((episodeId) => ({ id: episodeId })),
      relations: [],
    });

    const mappedSeasons = this.mapper.mapSeasons(seasons, episodes);

    return this.mapper.mapSeries(show, rootFolders, mappedSeasons);
  }

  public async getSeriesById(id: string): Promise<SonarrSeries> {
    const show = await this.tvShowDAO.findOne({
      where: { id: Number(id) },
      relations: [],
    });

    if (!show) {
      throw new NotFoundException('TV show not found');
    }

    return this.getSeries(String(show.id));
  }

  public async getSeriesQueue(): Promise<SonarrQueueItem[]> {
    const [seasonTorrents, episodeTorrents] = await Promise.all([
      this.torrentDAO.find({
        where: { resourceType: FileType.SEASON },
        order: { createdAt: 'DESC' },
        take: 50,
        relations: [],
      }),
      this.torrentDAO.find({
        where: { resourceType: FileType.EPISODE },
        order: { createdAt: 'DESC' },
        take: 50,
        relations: [],
      }),
    ]);

    if (seasonTorrents.length === 0 && episodeTorrents.length === 0) {
      return [];
    }

    const seasonIds = seasonTorrents.map((torrent) => torrent.resourceId);
    const episodeIds = episodeTorrents.map((torrent) => torrent.resourceId);

    const seasons = await this.seasonDAO.find({
      where: seasonIds.map((id) => ({ id })),
      relations: ['tvShow'],
    });
    const episodes = await this.episodeDAO.find({
      where: episodeIds.map((id) => ({ id })),
      relations: ['season', 'season.tvShow'],
    });

    const seasonMap = new Map(seasons.map((season) => [season.id, season]));
    const episodeMap = new Map(
      episodes.map((episode) => [episode.id, episode]),
    );

    const items = await Promise.all(
      [...seasonTorrents, ...episodeTorrents].map(async (torrent) => {
        const transmission = await this.getTransmissionTorrent(torrent);

        if (!transmission) {
          return null;
        }

        if (torrent.resourceType === FileType.SEASON) {
          const season = seasonMap.get(torrent.resourceId) as TVSeason | undefined;

          if (!season) {
            return null;
          }

          return this.mapper.mapSonarrQueueItem(torrent, transmission, {
            seriesId: season.tvShowId,
            seriesTmdbId: season.tvShow?.tmdbId,
            seriesTitle: season.tvShow?.title ?? '',
            seasonNumber: season.seasonNumber,
            episodeNumber: 0,
            episodeTitle: '',
          });
        }

        const episode = episodeMap.get(torrent.resourceId) as TVEpisode | undefined;

        if (!episode) {
          return null;
        }

        return this.mapper.mapSonarrQueueItem(torrent, transmission, {
          seriesId: episode.season.tvShowId,
          seriesTmdbId: episode.season.tvShow?.tmdbId,
          seriesTitle: episode.season.tvShow?.title ?? '',
          seasonNumber: episode.season.seasonNumber,
          episodeNumber: episode.episodeNumber,
          episodeId: episode.id,
          episodeTitle: episode.title,
        });
      }),
    );

    return items.filter((item: SonarrQueueItem | null): item is SonarrQueueItem => item !== null);
  }

  public async triggerSeriesSearch(id: string): Promise<void> {
    await this.tvShowDAO.findOne({
      where: { id: Number(id) },
      relations: [],
    });
  }

  public async triggerSeasonSearch(
    id: string,
    payload: { seasonNumber: number },
  ): Promise<void> {
    const season = await this.seasonDAO.findOne({
      where: { id: Number(id), seasonNumber: payload.seasonNumber },
      relations: [],
    });

    if (!season) {
      throw new NotFoundException('Season not found');
    }

    this.jobsService.startDownloadSeason(season.id);
  }

  public async addSeries(
    payload: {
      tmdbId: string;
      title?: string;
      seasons?: { seasonNumber: number }[];
    },
  ): Promise<SonarrSeries> {
    const seasonNumbers = (payload.seasons ?? []).map(
      (season) => season.seasonNumber,
    );

    if (seasonNumbers.length === 0) {
      throw new NotFoundException('Seasons not found');
    }

    await this.libraryOrganizationService.trackTVShow({
      tmdbId: Number(payload.tmdbId),
      seasonNumbers,
    });

    return this.mapper.mapSeries(
      (await this.libraryQueryService.getTVShow(Number(payload.tmdbId))) as unknown as EnrichedTVShow,
      await this.getRootFolders(),
    );
  }

  public async removeTVShow(id: string, _deleteFiles: boolean): Promise<void> {
    const show = await this.tvShowDAO.findOne({
      where: { id: Number(id) },
      relations: [],
    });

    if (!show) {
      throw new NotFoundException('TV show not found');
    }

    await this.libraryOrganizationService.removeTVShow(show.tmdbId);
  }

  public async updateSeries(
    id: string,
    body: { seasons: { seasonNumber: number; monitored: boolean }[] },
  ): Promise<void> {
    const show = await this.tvShowDAO.findOne({
      where: { id: Number(id) },
      relations: [],
    });

    if (!show) {
      throw new NotFoundException('TV show not found');
    }

    for (const seasonPayload of body.seasons ?? []) {
      const season = await this.seasonDAO.findOne({
        where: {
          tvShowId: Number(id),
          seasonNumber: seasonPayload.seasonNumber,
        },
        relations: [],
      });

      if (!season) {
        continue;
      }

      season.monitored = seasonPayload.monitored;
      await this.seasonDAO.save(season);
    }
  }

  private async getTransmissionTorrent(
    torrent: Torrent,
  ): Promise<TransmissionTorrent | null> {
    const transmission = await this.transmissionService.getTorrent(torrent.torrentHash);

    if (!transmission) {
      return null;
    }

    return transmission as unknown as TransmissionTorrent;
  }

  // ---------------------------------------------------------------------------
  // v3 (Sonarr v3 + Radarr v3 REST API)
  // ---------------------------------------------------------------------------

  public async getRootFoldersV3(): Promise<SonarrV3RootFolder[]> {
    const rootFolders = await this.getRootFolders();

    return Promise.all(
      rootFolders.map(async (mount) => ({
        id: mount.id,
        path: mount.path,
        accessible: mount.state === MediaMountState.READY,
        freeSpace: await getFreeSpace(mount.path),
      })),
    );
  }

  public getV3QualityProfiles(): SonarrV3QualityProfile[] {
    return [{ id: 1, name: 'Any' }];
  }

  public getV3SystemStatus(): SonarrV3SystemStatus {
    return {
      version: '4.10.0.8356',
      buildTime: new Date().toISOString(),
      isDebug: false,
      isInfo: false,
      isProduction: true,
      isActive: true,
      startupPath: '',
      appData: '',
    };
  }

  private v3SortTitle(title: string): string {
    return title.toLowerCase().replace(/^(the|an|the) /, '');
  }

  private v3TitleSlug(title: string): string {
    return title
      .replace(/[^0-9a-zA-Z]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private async buildV3Seasons(tvShowId: number): Promise<SonarrV3Season[]> {
    const seasons = await this.seasonDAO.find({
      where: { tvShowId },
      relations: ['episodes'],
      order: { seasonNumber: 'ASC' },
    });

    return seasons.map((season) => {
      const episodes = season.episodes ?? [];
      return {
        id: season.id,
        seasonNumber: season.seasonNumber,
        monitored: season.monitored,
        hasAllEpisodes:
          episodes.length > 0 &&
          episodes.every((episode) => isAvailable(episode.state)),
      };
    });
  }

  private async buildV3Series(
    show: Omit<EnrichedTVShow, 'runtime'>,
    tvShowId: number,
  ): Promise<SonarrV3Series> {
    const tmdb = await this.tmdbService.getTVShow(show.tmdbId);
    const seasons = await this.buildV3Seasons(tvShowId);
    const rootFolders = await this.getRootFoldersV3();
    const poster = tmdb.poster_path ? `${TMDB_IMG_BASE}${tmdb.poster_path}` : null;
    const year = Number(String(tmdb.first_air_date ?? '').slice(0, 4)) || 0;

    return {
      id: tvShowId,
      title: show.title,
      sortTitle: this.v3SortTitle(show.title),
      status: tmdb.status ?? 'Unknown',
      overview: show.overview,
      network: tmdb.origin_country?.[0] ?? null,
      airTime: '',
      images: poster
        ? [{ coverType: 'poster', url: `${TMDB_IMG_BASE}${tmdb.poster_path}`, remoteUrl: poster }]
        : [],
      remotePoster: poster,
      seasons,
      year,
      path: rootFolders[0]?.path ?? '',
      qualityProfileId: 1,
      seasonFolder: true,
      monitored: seasons.length > 0 && seasons.every((season) => season.monitored),
      useSceneNumbering: false,
      runtime: tmdb.episode_run_time?.[0] ?? 0,
      tvdbId: tmdb.id,
      firstAired: tmdb.first_air_date ?? '',
      seriesType: 'standard',
      cleanTitle: this.v3TitleSlug(show.title),
      titleSlug: this.v3TitleSlug(show.title),
      rootFolderPath: rootFolders[0]?.path ?? '',
      genres: tmdb.genres?.map((genre) => genre.name) ?? [],
      tags: [],
      ratings: { votes: 0, value: tmdb.vote_average ?? 0 },
    };
  }

  private async buildV3Movie(
    movie: EnrichedMovie,
  ): Promise<RadarrV3Movie> {
    const tmdb = await this.tmdbService.getMovie(movie.tmdbId);
    const rootFolders = await this.getRootFoldersV3();
    const poster = tmdb.poster_path ? `${TMDB_IMG_BASE}${tmdb.poster_path}` : null;
    const year = Number(String(tmdb.release_date ?? '').slice(0, 4)) || 0;

    return {
      id: movie.id,
      title: movie.title,
      originalTitle: tmdb.original_title ?? '',
      sortTitle: this.v3SortTitle(movie.title),
      status: tmdb.status ?? 'Unknown',
      overview: movie.overview,
      images: poster
        ? [{ coverType: 'poster', url: `${TMDB_IMG_BASE}${tmdb.poster_path}`, remoteUrl: poster }]
        : [],
      remotePoster: poster,
      year,
      path: rootFolders[0]?.path ?? '',
      qualityProfileId: 1,
      monitored: true,
      minimumAvailability: 'released',
      isAvailable: isAvailable(movie.state),
      runtime: tmdb.runtime ?? 0,
      cleanTitle: this.v3TitleSlug(movie.title),
      imdbId: tmdb.imdb_id ? String(tmdb.imdb_id) : null,
      tmdbId: movie.tmdbId,
      titleSlug: this.v3TitleSlug(movie.title),
      rootFolderPath: rootFolders[0]?.path ?? '',
      genres: tmdb.genres?.map((genre) => genre.name) ?? [],
      tags: [],
      ratings: { votes: 0, value: tmdb.vote_average ?? 0 },
      hasFile: isAvailable(movie.state),
      sizeOnDisk: 0,
    };
  }

  public async getV3SeriesList(): Promise<SonarrV3Series[]> {
    const shows = await this.libraryQueryService.getTVShows();
    return Promise.all(shows.map((show) => this.buildV3Series(show, show.id)));
  }

  public async getV3Series(tvShowId: number): Promise<SonarrV3Series> {
    const show = await this.libraryQueryService.getTVShow(tvShowId);
    return this.buildV3Series(show as unknown as EnrichedTVShow, tvShowId);
  }

  public async getV3SeriesByTvdbId(tvdbId: number): Promise<SonarrV3Series> {
    const resolved = await this.tmdbService.searchTVShowByTvdbId(tvdbId);

    if (!resolved) {
      throw new NotFoundException('TV show not found');
    }

    const tmdb = await this.tmdbService.getTVShow(resolved.id);
    const poster = tmdb.poster_path ? `${TMDB_IMG_BASE}${tmdb.poster_path}` : null;
    const year = Number(String(tmdb.first_air_date ?? '').slice(0, 4)) || 0;

    return {
      id: 0,
      title: tmdb.name,
      sortTitle: this.v3TitleSlug(tmdb.name),
      status: tmdb.status ?? 'Unknown',
      overview: tmdb.overview ?? '',
      network: tmdb.origin_country?.[0] ?? null,
      airTime: '',
      images: poster
        ? [{ coverType: 'poster', url: `${TMDB_IMG_BASE}${tmdb.poster_path}`, remoteUrl: poster }]
        : [],
      remotePoster: poster,
      seasons: [],
      year,
      path: '',
      monitored: true,
      seasonFolder: true,
      useSceneNumbering: false,
      runtime: tmdb.episode_run_time?.[0] ?? 0,
      tvdbId: tmdb.id,
      firstAired: tmdb.first_air_date ?? '',
      seriesType: 'standard',
      cleanTitle: this.v3TitleSlug(tmdb.name),
      titleSlug: this.v3TitleSlug(tmdb.name),
      genres: tmdb.genres?.map((genre) => genre.name) ?? [],
      tags: [],
      ratings: { votes: 0, value: tmdb.vote_average ?? 0 },
    };
  }

  public async addV3Series(payload: SonarrV3Series): Promise<SonarrV3Series> {
    const resolved = await this.tmdbService.searchTVShowByTvdbId(payload.tvdbId);

    if (!resolved) {
      throw new NotFoundException('TV show not found');
    }

    const seasonNumbers =
      payload.seasons
        ?.map((season) => season.seasonNumber)
        .filter((seasonNumber) => seasonNumber >= 1) ?? [];

    if (seasonNumbers.length === 0) {
      throw new NotFoundException('Seasons not found');
    }

    const { id } = await this.libraryOrganizationService.trackTVShow({
      tmdbId: resolved.id,
      seasonNumbers,
    });

    const show = await this.libraryQueryService.getTVShow(id);
    return this.buildV3Series(show as unknown as EnrichedTVShow, id);
  }

  public async updateV3Series(
    id: number,
    body: { seasons?: { seasonNumber: number; monitored: boolean }[] },
  ): Promise<SonarrV3Series> {
    await this.tvShowDAO.findOneOrFail({
      where: { id },
      relations: [],
    });

    for (const season of body.seasons ?? []) {
      const existing = await this.seasonDAO.findOne({
        where: { tvShowId: id, seasonNumber: season.seasonNumber },
        relations: [],
      });

      if (!existing) {
        continue;
      }

      existing.monitored = season.monitored;
      await this.seasonDAO.save(existing);
    }

    const show = await this.libraryQueryService.getTVShow(id);
    return this.buildV3Series(show as unknown as EnrichedTVShow, id);
  }

  public async getV3EpisodesBySeriesId(
    seriesId: number,
  ): Promise<SonarrV3Episode[]> {
    const episodes = await this.episodeDAO.find({
      where: { tvShowId: seriesId },
      relations: ['season'],
      order: { seasonNumber: 'ASC', episodeNumber: 'ASC' },
    });

    return episodes.map((episode) => ({
      id: episode.id,
      seriesId,
      tvdbId: episode.id,
      episodeFileId: 0,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      airDate: '',
      airDateUtc: '',
      overview: '',
      hasFile: isAvailable(episode.state),
      monitored: episode.season?.monitored ?? true,
    }));
  }

  public async getV3EpisodeFilesBySeriesId(
    seriesId: number,
  ): Promise<SonarrV3EpisodeFile[]> {
    const files = await this.fileDAO.find({
      where: { tvEpisode: { tvShowId: seriesId } },
      relations: ['tvEpisode'],
    });

    return files.map((file) => ({
      id: file.id,
      seriesId,
      seasonNumber: file.tvEpisode.seasonNumber,
      relativePath: this.basename(file.path),
      path: file.path,
      size: 0,
      sizeWhenDone: 0,
      dateAdded: file.createdAt.toISOString(),
      quality: { quality: { id: 1, name: 'Any' } },
    }));
  }

  private basename(path: string): string {
    return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? path;
  }

  public async addV3Movie(
    payload: { tmdbId: number; title?: string },
  ): Promise<RadarrV3Movie> {
    const { id } = await this.libraryOrganizationService.trackMovie({
      tmdbId: Number(payload.tmdbId),
      title: payload.title,
    });

    const movie = await this.libraryQueryService.getMovie(id);
    return this.buildV3Movie(movie as unknown as EnrichedMovie);
  }

  public async getV3MovieList(): Promise<RadarrV3Movie[]> {
    const movies = await this.libraryQueryService.getMovies();
    return Promise.all(movies.map((movie) => this.buildV3Movie(movie as unknown as EnrichedMovie)));
  }

  public async getV3Movie(id: number): Promise<RadarrV3Movie> {
    const movie = await this.libraryQueryService.getMovie(id);
    return this.buildV3Movie(movie as unknown as EnrichedMovie);
  }

  public async getV3MovieByTmdbId(tmdbId: number): Promise<RadarrV3Movie> {
    const tmdb = await this.tmdbService.getMovie(tmdbId);
    const rootFolders = await this.getRootFoldersV3();
    const poster = tmdb.poster_path ? `${TMDB_IMG_BASE}${tmdb.poster_path}` : null;
    const year = Number(String(tmdb.release_date ?? '').slice(0, 4)) || 0;

    return {
      id: 0,
      title: tmdb.title,
      originalTitle: tmdb.original_title ?? '',
      sortTitle: this.v3TitleSlug(tmdb.title),
      status: tmdb.status ?? 'Unknown',
      overview: tmdb.overview ?? '',
      images: poster
        ? [{ coverType: 'poster', url: `${TMDB_IMG_BASE}${tmdb.poster_path}`, remoteUrl: poster }]
        : [],
      remotePoster: poster,
      year,
      path: rootFolders[0]?.path ?? '',
      qualityProfileId: 1,
      monitored: true,
      minimumAvailability: 'released',
      isAvailable: false,
      runtime: tmdb.runtime ?? 0,
      cleanTitle: this.v3TitleSlug(tmdb.title),
      imdbId: tmdb.imdb_id ? String(tmdb.imdb_id) : null,
      tmdbId: tmdb.id,
      titleSlug: this.v3TitleSlug(tmdb.title),
      rootFolderPath: rootFolders[0]?.path ?? '',
      genres: tmdb.genres?.map((genre) => genre.name) ?? [],
      tags: [],
      ratings: { votes: 0, value: tmdb.vote_average ?? 0 },
      hasFile: false,
      sizeOnDisk: 0,
    };
  }

  public async triggerV3SeasonSearch(
    showId: number,
    seasonNumber: number,
  ): Promise<void> {
    const season = await this.seasonDAO.findOne({
      where: { tvShowId: showId, seasonNumber },
      relations: [],
    });

    if (!season) {
      throw new NotFoundException('Season not found');
    }

    this.jobsService.startDownloadSeason(season.id);
  }

  private async mapV3SonarrQueueItem(
    torrent: Torrent,
    transmission: TransmissionTorrent,
    info: {
      seriesId: number;
      title: string;
      episodeId?: number;
      episodeNumber?: number;
      seasonNumber?: number;
      episodeTitle?: string;
    },
  ): Promise<SonarrV3QueueItem> {
    const size = transmission.totalSize;
    const sizeleft = transmission.leftUntilDone || size;

    return {
      id: torrent.id,
      seriesId: info.seriesId,
      episodeId: info.episodeId ?? 0,
      movieId: 0,
      title: info.title,
      size,
      sizeleft,
      timeleft: this.formatTimeLeft(transmission.leftUntilDone),
      estimatedCompletionTime: '',
      status: transmission.percentDone >= 1 ? 'completed' : 'downloading',
      trackedDownloadStatus: 'warning',
      trackedDownloadState: 'warning',
      downloadId: torrent.torrentHash,
      protocol: 'torrent',
      downloadClient: '',
      indexer: '',
      outputPath: '',
      episode: info.episodeId
        ? {
            episodeNumber: info.episodeNumber ?? 0,
            seasonNumber: info.seasonNumber ?? 0,
            title: info.episodeTitle ?? info.title,
          }
        : undefined,
      series: { id: info.seriesId, title: info.title },
    };
  }

  private async mapV3RadarrQueueItem(
    torrent: Torrent,
    transmission: TransmissionTorrent,
    info: { movieId: number; title: string },
  ): Promise<RadarrV3QueueItem> {
    const size = transmission.totalSize;
    const sizeleft = transmission.leftUntilDone || size;

    return {
      id: torrent.id,
      movieId: info.movieId,
      seriesId: 0,
      title: info.title,
      size,
      sizeleft,
      timeleft: this.formatTimeLeft(transmission.leftUntilDone),
      estimatedCompletionTime: '',
      status: transmission.percentDone >= 1 ? 'completed' : 'downloading',
      trackedDownloadStatus: 'warning',
      trackedDownloadState: 'warning',
      downloadId: torrent.torrentHash,
      protocol: 'torrent',
      downloadClient: '',
      indexer: '',
      outputPath: '',
      movie: { id: info.movieId, title: info.title },
    };
  }

  private formatTimeLeft(seconds: number): string {
    if (!seconds || !isFinite(seconds)) {
      return '';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours}h ${minutes}m ${secs}s`;
  }

  public async getV3SonarrQueue(): Promise<SonarrV3QueueItem[]> {
    const [seasonTorrents, episodeTorrents] = await Promise.all([
      this.torrentDAO.find({
        where: { resourceType: FileType.SEASON },
        order: { updatedAt: 'DESC' },
        take: 50,
        relations: [],
      }),
      this.torrentDAO.find({
        where: { resourceType: FileType.EPISODE },
        order: { updatedAt: 'DESC' },
        take: 50,
        relations: [],
      }),
    ]);

    const [seasons, shows] = await Promise.all([
      this.seasonDAO.find({ relations: ['tvShow'] }),
      this.tvShowDAO.find({ relations: [] }),
    ]);
    const showById = new Map(shows.map((show) => [show.id, show]));

    const items: SonarrV3QueueItem[] = [];

    for (const torrent of [...seasonTorrents, ...episodeTorrents]) {
      const transmission = await this.getTransmissionTorrent(torrent);

      if (!transmission || transmission.totalSize === 0) {
        continue;
      }

      if (torrent.resourceType === FileType.SEASON) {
        const season = seasons.find((item) => item.id === torrent.resourceId);

        if (!season) {
          continue;
        }

        const show = showById.get(season.tvShowId);

        items.push(
          await this.mapV3SonarrQueueItem(torrent, transmission, {
            seriesId: season.tvShowId,
            title: show?.title ?? '',
          }),
        );
      } else {
        const episode = await this.episodeDAO.findOne({
          where: { id: torrent.resourceId },
          relations: ['season', 'season.tvShow'],
        });

        if (!episode) {
          continue;
        }

        const show = showById.get(episode.season.tvShowId);

        items.push(
          await this.mapV3SonarrQueueItem(torrent, transmission, {
            seriesId: episode.season.tvShowId,
            title: show?.title ?? '',
            episodeId: episode.id,
            episodeNumber: episode.episodeNumber,
            seasonNumber: episode.season.seasonNumber,
            episodeTitle: episode.title,
          }),
        );
      }
    }

    return items;
  }

  public async getV3RadarrQueue(): Promise<RadarrV3QueueItem[]> {
    const torrents = await this.torrentDAO.find({
      where: { resourceType: FileType.MOVIE },
      order: { updatedAt: 'DESC' },
      take: 50,
      relations: [],
    });

    if (torrents.length === 0) {
      return [];
    }

    const movies = await this.movieDAO.find({
      where: torrents.map((torrent) => ({ id: torrent.resourceId })),
      relations: [],
    });
    const movieById = new Map(movies.map((movie) => [movie.id, movie]));

    const items: RadarrV3QueueItem[] = [];

    for (const torrent of torrents) {
      const transmission = await this.getTransmissionTorrent(torrent);

      if (!transmission || transmission.totalSize === 0) {
        continue;
      }

      const movie = movieById.get(torrent.resourceId);

      items.push(
        await this.mapV3RadarrQueueItem(torrent, transmission, {
          movieId: torrent.resourceId,
          title: movie?.title ?? '',
        }),
      );
    }

    return items;
  }
}
