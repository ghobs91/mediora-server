import { Injectable, NotFoundException } from '@nestjs/common';

import { FileType } from 'src/app.dto';
import { TMDBService } from 'src/modules/tmdb/tmdb.service';
import { TransmissionService } from 'src/modules/transmission/transmission.service';
import { LibraryQueryService } from 'src/modules/library/library-query.service';
import { EnrichedMovie, EnrichedTVShow } from 'src/modules/library/library.dto';
import { LibraryOrganizationService } from 'src/modules/library/library-organization.service';
import { MediaMountsService } from 'src/modules/library/media-mounts.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { MediaMount } from 'src/entities/media-mount.entity';
import { Torrent } from 'src/entities/torrent.entity';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';
import { Movie } from 'src/entities/movie.entity';
import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';

import { RadarrMovie, RadarrQueueItem } from '../dto/radarr.dto';
import { SonarrQueueItem, SonarrSeries } from '../dto/sonarr.dto';
import { MediaMapper } from '../mappers/media-mapper';

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
}
