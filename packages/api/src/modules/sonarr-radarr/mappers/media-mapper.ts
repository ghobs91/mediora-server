import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

import { DownloadableMediaState } from 'src/app.dto';
import { TMDBService } from 'src/modules/tmdb/tmdb.service';
import { EnrichedMovie, EnrichedTVShow } from 'src/modules/library/library.dto';
import { MediaMount } from 'src/entities/media-mount.entity';
import { Torrent } from 'src/entities/torrent.entity';

import { RadarrMovie, RadarrQueueItem } from '../dto/radarr.dto';
import {
  SonarrSeason,
  SonarrSeries,
  SonarrQueueItem,
} from '../dto/sonarr.dto';

import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

function imageUrl(path?: string | null): string | null {
  return path ? TMDB_IMG_BASE + path : null;
}

export function isAvailable(state: DownloadableMediaState): boolean {
  return (
    state === DownloadableMediaState.DOWNLOADED ||
    state === DownloadableMediaState.PROCESSED
  );
}

export async function getFreeSpace(path: string): Promise<number> {
  try {
    const statvfs = (fs as unknown as { statvfs?: unknown }).statvfs;

    if (typeof statvfs !== 'function') {
      return 0;
    }

    const stats = await new Promise<{ f_bsize: number; f_bavail: number }>(
      (resolve, reject) => {
        (statvfs as (p: string, cb: (e: Error | null, s: { f_bsize: number; f_bavail: number }) => void) => void)(
          path,
          (err, s) => (err ? reject(err) : resolve(s))
        );
      }
    );

    return stats.f_bavail * stats.f_bsize;
  } catch {
    return 0;
  }
}

@Injectable()
export class MediaMapper {
  public constructor(private readonly tmdbService: TMDBService) {}

  public async mapMovie(
    enriched: EnrichedMovie,
    rootFolders: MediaMount[]
  ): Promise<RadarrMovie> {
    const full = await this.tmdbService.getMovie(enriched.tmdbId);

    return {
      id: String(enriched.id),
      isAvailable: isAvailable(enriched.state),
      tmdbId: String(enriched.tmdbId),
      imdbId: full.imdb_id ? String(full.imdb_id) : '',
      title: enriched.title,
      originalTitle: enriched.originalTitle ?? null,
      originalFileNamePrefix: `${enriched.title} (${this.year(enriched)})`,
      summary: enriched.overview,
      year: this.year(enriched),
      path: rootFolders[0]?.path ?? '',
      runtime: `${enriched.runtime} minutes`,
      releaseDate: enriched.releaseDate,
      posterPath: imageUrl(enriched.posterPath),
      coverType: 'poster',
      coverUrl: imageUrl(enriched.posterPath),
      monogram: this.monogram(enriched.title),
      rating: enriched.voteAverage,
      hasFile: isAvailable(enriched.state),
      isMovieAvailable: isAvailable(enriched.state),
      genres: full.genres?.map((genre) => ({
        id: genre.id,
        name: genre.name,
      })),
      rootFolders: await Promise.all(
        rootFolders.map(async (mount) => ({
          id: String(mount.id),
          path: mount.path,
          freeSpace: await getFreeSpace(mount.path),
          isAvailable: true,
        }))
      ),
      qualityProfiles: [],
      hasPreRollingJob: false,
    };
  }

  public async mapSeries(
    enriched: EnrichedTVShow,
    rootFolders: MediaMount[],
    seasons: SonarrSeason[] = [],
  ): Promise<SonarrSeries> {
    const full = await this.tmdbService.getTVShow(enriched.tmdbId);

    const monitoredSeasons = seasons.filter((season) => season.isMonitored);
    const hasAllEpisodesAvailable =
      monitoredSeasons.length > 0 &&
      monitoredSeasons.every((season) => season.hasAllEpisodes);
    const hasFile = monitoredSeasons.some((season) => season.hasAllEpisodes);

    return {
      id: String(enriched.id),
      isAvailable: hasAllEpisodesAvailable,
      tvdbId: String(full.id),
      imdbId: null,
      title: enriched.title,
      originalTitle: enriched.originalTitle ?? null,
      summary: enriched.overview,
      network: full.origin_country?.[0] ?? null,
      year: this.year(enriched),
      path: rootFolders[0]?.path ?? '',
      runtime: null,
      releaseDate: enriched.releaseDate,
      posterPath: imageUrl(enriched.posterPath),
      coverType: 'poster',
      coverUrl: imageUrl(enriched.posterPath),
      monogram: this.monogram(enriched.title),
      rating: enriched.voteAverage,
      hasFile,
      isMovieAvailable: hasFile,
      genres: full.genres?.map((genre) => ({
        id: genre.id,
        name: genre.name,
      })),
      seasons,
    };
  }

  public mapSeasons(seasons: TVSeason[], episodes: TVEpisode[]): SonarrSeason[] {
    return seasons.map((season) => {
      const seasonEpisodes = episodes.filter(
        (episode) => episode.seasonId === season.id
      );

      return {
        id: String(season.id),
        isAvailable: isAvailable(season.state),
        seasonNumber: season.seasonNumber,
        isMonitored: season.monitored,
        hasAllEpisodes:
          seasonEpisodes.length > 0 &&
          seasonEpisodes.every((episode) => isAvailable(episode.state)),
        episodes: seasonEpisodes.map((episode) => ({
          id: String(episode.id),
          isAvailable: isAvailable(episode.state),
          episodeNumber: episode.episodeNumber,
          seasonNumber: season.seasonNumber,
          title: episode.title,
          airDate: null,
          seriesId: String(season.tvShowId),
          hasFile: isAvailable(episode.state),
          isMonitored: season.monitored,
          files: [],
          genres: [],
        })),
      };
    });
  }

  public mapQueueItem(
    torrent: Torrent,
    transmissionTorrent: {
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
    },
    info: {
      movieId: number;
      movieTmdbId?: number;
      title: string;
    }
  ): RadarrQueueItem {
    const { percentDone } = transmissionTorrent;
    const completed = percentDone >= 1;
    const totalSize = transmissionTorrent.totalSize;

    return {
      id: String(torrent.id),
      isAvailable: completed,
      movieId: String(info.movieId),
      movieTmdbId: info.movieTmdbId ? String(info.movieTmdbId) : '',
      title: info.title,
      size: `${(totalSize / 1e9).toFixed(2)} GB`,
      sizeleft: `${((transmissionTorrent.leftUntilDone || totalSize) / 1e9).toFixed(2)} GB`,
      status: completed ? 'completed' : 'downloading',
      statusMessages: '',
      downloadId: transmissionTorrent.hashString,
      queued: !completed,
      percentDone,
      timeleft: transmissionTorrent.eta,
      projectedCompletion: 0,
      trackedDownloadStatus: '',
      trackedDownloadState: completed ? 'completed' : 'downloading',
      isFullAvailable: completed,
      fullAvailable: completed,
      sizeleftKnown: totalSize > 0,
      completed,
    };
  }

  public mapSonarrQueueItem(
    torrent: Torrent,
    transmissionTorrent: {
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
    },
    info: {
      seriesId: number;
      seriesTmdbId?: number;
      seriesTitle: string;
      seasonNumber: number;
      episodeNumber: number;
      episodeId?: number;
      episodeTitle?: string;
    }
  ): SonarrQueueItem {
    const { percentDone } = transmissionTorrent;
    const completed = percentDone >= 1;

    return {
      id: String(torrent.id),
      isAvailable: completed,
      seriesId: String(info.seriesId),
      seriesTmdbId: info.seriesTmdbId ? String(info.seriesTmdbId) : '',
      episodeId: info.episodeId ? String(info.episodeId) : '',
      seriesTitle: info.seriesTitle,
      episodeTitle: info.episodeTitle ?? '',
      seasonNumber: info.seasonNumber,
      episodeNumber: info.episodeNumber,
      size: `${(transmissionTorrent.totalSize / 1e9).toFixed(2)} GB`,
      sizeleft: `${((transmissionTorrent.leftUntilDone || transmissionTorrent.totalSize) / 1e9).toFixed(2)} GB`,
      status: completed ? 'completed' : 'downloading',
      statusMessages: '',
      downloadId: transmissionTorrent.hashString,
      queued: !completed,
      percentDone,
      timeleft: transmissionTorrent.eta,
      projectedCompletion: 0,
      trackedDownloadStatus: '',
      trackedDownloadState: completed ? 'completed' : 'downloading',
      isFullAvailable: completed,
      fullAvailable: completed,
      sizeleftKnown: transmissionTorrent.totalSize > 0,
      completed,
    };
  }

  private year(enriched: EnrichedMovie | EnrichedTVShow): string {
    const parts = String(enriched.releaseDate).split('-');

    return parts[0];
  }

  private monogram(title: string): string {
    return (title.match(/\b([A-Za-z])/)?.[0] ?? '?').toUpperCase();
  }
}
