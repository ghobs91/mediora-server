// v3 DTOs matching the shapes consumed by the mediora client's
// SonarrService / RadarrService (which append /api/v3). These intentionally
// mirror real Sonarr v3 + Radarr v3 payloads so the existing client services
// work unchanged in mediora-server (Bobarr) mode.

export interface SonarrV3Image {
  coverType: string;
  url: string;
  remoteUrl?: string | null;
  thumbUrl?: string | null;
}

export interface SonarrV3SeasonStatistics {
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  percentOfEpisodes: number;
}

export interface SonarrV3Season {
  id: number;
  seasonNumber: number;
  monitored: boolean;
  hasAllEpisodes: boolean;
  hasMissingEpisodes?: boolean;
  hasEpisodes?: boolean;
  statistics?: SonarrV3SeasonStatistics | null;
}

export interface SonarrV3Episode {
  id: number;
  seriesId: number;
  tvdbId: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  overview: string;
  hasFile: boolean;
  monitored: boolean;
}

export interface SonarrV3EpisodeFile {
  id: number;
  seriesId: number;
  seasonNumber: number;
  relativePath: string;
  path: string;
  size: number;
  sizeWhenDone: number;
  dateAdded: string;
  quality: {
    quality: { id: number; name: string };
    modified?: number;
  };
}

export interface SonarrV3Series {
  id: number;
  title: string;
  sortTitle: string;
  status: string;
  overview: string;
  network?: string | null;
  airTime: string;
  images: SonarrV3Image[];
  remotePoster: string | null;
  seasons: SonarrV3Season[];
  year: number;
  path: string;
  qualityProfileId?: number;
  seasonFolder: boolean;
  monitored: boolean;
  useSceneNumbering: boolean;
  runtime: number;
  tvdbId: number;
  imdbId?: string | null;
  firstAired: string;
  seriesType: string;
  cleanTitle: string;
  titleSlug: string;
  rootFolderPath?: string;
  genres: string[];
  tags: number[];
  ratings: { votes: number; value: number };
}

export interface SonarrV3QueueItem {
  id: number;
  seriesId: number;
  episodeId: number;
  title: string;
  size: number;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime: string;
  status: string;
  trackedDownloadStatus: string;
  trackedDownloadState: string;
  downloadId: string;
  protocol: string;
  downloadClient: string;
  indexer: string;
  outputPath: string;
  movieId?: number;
  episode?: { episodeNumber: number; seasonNumber: number; title: string };
  series?: { id: number; title: string };
}

export interface RadarrV3Image {
  coverType: string;
  url: string;
  remoteUrl?: string | null;
}

export interface RadarrV3Movie {
  id: number;
  title: string;
  originalTitle: string;
  sortTitle: string;
  status: string;
  overview: string;
  images: RadarrV3Image[];
  remotePoster: string | null;
  year: number;
  path: string;
  qualityProfileId?: number;
  monitored: boolean;
  minimumAvailability: string;
  isAvailable: boolean;
  runtime: number;
  cleanTitle: string;
  imdbId?: string | null;
  tmdbId: number;
  titleSlug: string;
  rootFolderPath?: string;
  genres: string[];
  tags: number[];
  ratings: { votes: number; value: number };
  hasFile?: boolean;
  sizeOnDisk?: number;
}

export interface RadarrV3QueueItem {
  id: number;
  movieId: number;
  title: string;
  size: number;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime: string;
  status: string;
  trackedDownloadStatus: string;
  trackedDownloadState: string;
  downloadId: string;
  protocol: string;
  downloadClient: string;
  indexer: string;
  outputPath: string;
  seriesId?: number;
  movie?: { id: number; title: string };
}

export interface SonarrV3QualityProfile {
  id: number;
  name: string;
}

export interface RadarrV3QualityProfile {
  id: number;
  name: string;
}

export interface SonarrV3RootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
}

export interface RadarrV3RootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
}

export interface SonarrV3SystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isInfo: boolean;
  isProduction: boolean;
  isActive: boolean;
  startupPath: string;
  appData: string;
}
