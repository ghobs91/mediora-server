/* eslint-disable */
/* this is a generated file, do not edit */
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
  DateTime: { input: any; output: any; }
};

export type ControlTorrentInput = {
  resourceId: Scalars['Int']['input'];
  resourceType: FileType;
};

export enum DownloadableMediaState {
  Downloaded = 'DOWNLOADED',
  Downloading = 'DOWNLOADING',
  Missing = 'MISSING',
  Processed = 'PROCESSED',
  Searching = 'SEARCHING'
}

export type DownloadingMedia = {
  __typename?: 'DownloadingMedia';
  id: Scalars['String']['output'];
  quality: Scalars['String']['output'];
  resourceId: Scalars['Float']['output'];
  resourceType: FileType;
  tag: Scalars['String']['output'];
  title: Scalars['String']['output'];
  torrent: Scalars['String']['output'];
};

export type EnrichedMovie = {
  __typename?: 'EnrichedMovie';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  originalTitle?: Maybe<Scalars['String']['output']>;
  overview: Scalars['String']['output'];
  posterPath?: Maybe<Scalars['String']['output']>;
  releaseDate: Scalars['String']['output'];
  runtime?: Maybe<Scalars['Float']['output']>;
  state: DownloadableMediaState;
  title: Scalars['String']['output'];
  tmdbId: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  voteAverage: Scalars['Float']['output'];
};

export type EnrichedTvEpisode = {
  __typename?: 'EnrichedTVEpisode';
  createdAt: Scalars['DateTime']['output'];
  episodeNumber: Scalars['Float']['output'];
  id: Scalars['Float']['output'];
  releaseDate: Scalars['String']['output'];
  seasonNumber: Scalars['Float']['output'];
  state: DownloadableMediaState;
  tvShow: TvShow;
  updatedAt: Scalars['DateTime']['output'];
  voteAverage?: Maybe<Scalars['Float']['output']>;
};

export type EnrichedTvShow = {
  __typename?: 'EnrichedTVShow';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  originalTitle?: Maybe<Scalars['String']['output']>;
  overview: Scalars['String']['output'];
  posterPath?: Maybe<Scalars['String']['output']>;
  releaseDate: Scalars['String']['output'];
  runtime?: Maybe<Scalars['Float']['output']>;
  title: Scalars['String']['output'];
  tmdbId: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  voteAverage: Scalars['Float']['output'];
};

export enum Entertainment {
  Movie = 'Movie',
  TvShow = 'TvShow'
}

export enum FileType {
  Episode = 'EPISODE',
  Movie = 'MOVIE',
  Season = 'SEASON'
}

export type GetTorrentStatusInput = {
  resourceId: Scalars['Int']['input'];
  resourceType: FileType;
};

export type GraphQlCommonResponse = {
  __typename?: 'GraphQLCommonResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type JackettFormattedResult = {
  __typename?: 'JackettFormattedResult';
  downloadLink: Scalars['String']['output'];
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  normalizedTitle: Scalars['String']['output'];
  normalizedTitleParts: Array<Scalars['String']['output']>;
  peers: Scalars['Float']['output'];
  publishDate: Scalars['String']['output'];
  quality: Scalars['String']['output'];
  qualityScore: Scalars['Float']['output'];
  seeders: Scalars['Float']['output'];
  size: Scalars['BigInt']['output'];
  tag: Scalars['String']['output'];
  tagScore: Scalars['Float']['output'];
  title: Scalars['String']['output'];
};

export type JackettInput = {
  downloadLink: Scalars['String']['input'];
  quality: Scalars['String']['input'];
  tag: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type LibraryCalendar = {
  __typename?: 'LibraryCalendar';
  movies: Array<EnrichedMovie>;
  tvEpisodes: Array<EnrichedTvEpisode>;
};

export type LibraryFileDetails = {
  __typename?: 'LibraryFileDetails';
  id: Scalars['Float']['output'];
  libraryFileSize?: Maybe<Scalars['BigInt']['output']>;
  libraryPath: Scalars['String']['output'];
  torrentFileName?: Maybe<Scalars['String']['output']>;
};

export enum LibraryFolderState {
  Inaccessible = 'INACCESSIBLE',
  Missing = 'MISSING',
  NotDirectory = 'NOT_DIRECTORY',
  Ready = 'READY',
  ReadOnly = 'READ_ONLY'
}

export type LibraryFolderStatus = {
  __typename?: 'LibraryFolderStatus';
  canCreate: Scalars['Boolean']['output'];
  canRead: Scalars['Boolean']['output'];
  canTraverse: Scalars['Boolean']['output'];
  canWrite: Scalars['Boolean']['output'];
  exists: Scalars['Boolean']['output'];
  isDirectory: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  mode?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  ownerGid?: Maybe<Scalars['Int']['output']>;
  ownerUid?: Maybe<Scalars['Int']['output']>;
  path: Scalars['String']['output'];
  remedy?: Maybe<Scalars['String']['output']>;
  state: LibraryFolderState;
  type: Scalars['String']['output'];
};

export type LibraryFoldersStatus = {
  __typename?: 'LibraryFoldersStatus';
  folders: Array<LibraryFolderStatus>;
  moviesMountId?: Maybe<Scalars['Int']['output']>;
  mount?: Maybe<LibraryFolderStatus>;
  processGid?: Maybe<Scalars['Int']['output']>;
  processRunsAsRoot: Scalars['Boolean']['output'];
  processUid?: Maybe<Scalars['Int']['output']>;
  tvShowsMountId?: Maybe<Scalars['Int']['output']>;
};

export type MediaMount = {
  __typename?: 'MediaMount';
  accessType: MediaMountAccessType;
  createdAt: Scalars['DateTime']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  label?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  state: MediaMountState;
  updatedAt: Scalars['DateTime']['output'];
};

export enum MediaMountAccessType {
  ReadOnly = 'READ_ONLY',
  ReadWrite = 'READ_WRITE'
}

export enum MediaMountState {
  Inaccessible = 'INACCESSIBLE',
  Missing = 'MISSING',
  NotDirectory = 'NOT_DIRECTORY',
  Ready = 'READY',
  ReadOnly = 'READ_ONLY'
}

export type Movie = {
  __typename?: 'Movie';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  state: DownloadableMediaState;
  title: Scalars['String']['output'];
  tmdbId: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addMediaMount: GraphQlCommonResponse;
  clearRedisCache: GraphQlCommonResponse;
  downloadMovie: GraphQlCommonResponse;
  downloadOwnTorrent: GraphQlCommonResponse;
  downloadSeason: GraphQlCommonResponse;
  downloadTVEpisode: GraphQlCommonResponse;
  pauseTorrents: GraphQlCommonResponse;
  refreshMediaMountState: GraphQlCommonResponse;
  removeMediaMount: GraphQlCommonResponse;
  removeMovie: GraphQlCommonResponse;
  removeTVShow: GraphQlCommonResponse;
  removeTorrents: GraphQlCommonResponse;
  removeTorrentsAndFiles: GraphQlCommonResponse;
  resetLibrary: GraphQlCommonResponse;
  resumeTorrents: GraphQlCommonResponse;
  saveQualityParams: GraphQlCommonResponse;
  saveTags: GraphQlCommonResponse;
  startDownloadMissingJob: GraphQlCommonResponse;
  startFindNewEpisodesJob: GraphQlCommonResponse;
  startScanLibraryJob: GraphQlCommonResponse;
  trackMovie: Movie;
  trackTVShow: TvShow;
  updateLibraryFolders: LibraryFoldersStatus;
  updateMediaMountAccessType: GraphQlCommonResponse;
  updateMediaMountLabel: GraphQlCommonResponse;
  updateParams: GraphQlCommonResponse;
};


export type MutationAddMediaMountArgs = {
  accessType?: InputMaybe<MediaMountAccessType>;
  label?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
};


export type MutationDownloadMovieArgs = {
  jackettResult: JackettInput;
  movieId: Scalars['Int']['input'];
};


export type MutationDownloadOwnTorrentArgs = {
  mediaId: Scalars['Int']['input'];
  mediaType: FileType;
  torrent: Scalars['String']['input'];
};


export type MutationDownloadSeasonArgs = {
  jackettResult: JackettInput;
  seasonNumber: Scalars['Int']['input'];
  tvShowTMDBId: Scalars['Int']['input'];
};


export type MutationDownloadTvEpisodeArgs = {
  episodeId: Scalars['Int']['input'];
  jackettResult: JackettInput;
};


export type MutationPauseTorrentsArgs = {
  torrents: Array<ControlTorrentInput>;
};


export type MutationRefreshMediaMountStateArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveMediaMountArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveMovieArgs = {
  tmdbId: Scalars['Int']['input'];
};


export type MutationRemoveTvShowArgs = {
  tmdbId: Scalars['Int']['input'];
};


export type MutationRemoveTorrentsArgs = {
  torrents: Array<ControlTorrentInput>;
};


export type MutationRemoveTorrentsAndFilesArgs = {
  torrents: Array<ControlTorrentInput>;
};


export type MutationResetLibraryArgs = {
  deleteFiles: Scalars['Boolean']['input'];
  resetSettings: Scalars['Boolean']['input'];
};


export type MutationResumeTorrentsArgs = {
  torrents: Array<ControlTorrentInput>;
};


export type MutationSaveQualityParamsArgs = {
  qualities: Array<QualityInput>;
};


export type MutationSaveTagsArgs = {
  tags: Array<TagInput>;
};


export type MutationTrackMovieArgs = {
  title: Scalars['String']['input'];
  tmdbId: Scalars['Int']['input'];
};


export type MutationTrackTvShowArgs = {
  seasonNumbers: Array<Scalars['Int']['input']>;
  tmdbId: Scalars['Int']['input'];
};


export type MutationUpdateLibraryFoldersArgs = {
  moviesFolderName: Scalars['String']['input'];
  moviesMountId?: InputMaybe<Scalars['Int']['input']>;
  tvShowsFolderName: Scalars['String']['input'];
  tvShowsMountId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationUpdateMediaMountAccessTypeArgs = {
  accessType: MediaMountAccessType;
  id: Scalars['Int']['input'];
};


export type MutationUpdateMediaMountLabelArgs = {
  id: Scalars['Int']['input'];
  label: Scalars['String']['input'];
};


export type MutationUpdateParamsArgs = {
  params: Array<UpdateParamsInput>;
};

export type OmdbInfo = {
  __typename?: 'OMDBInfo';
  ratings: Ratings;
};

export type ParamsHash = {
  __typename?: 'ParamsHash';
  jackett_api_key: Scalars['String']['output'];
  language: Scalars['String']['output'];
  max_movie_download_size: Scalars['String']['output'];
  max_tvshow_episode_download_size: Scalars['String']['output'];
  organize_library_strategy: Scalars['String']['output'];
  region: Scalars['String']['output'];
  tmdb_api_key: Scalars['String']['output'];
};

export type Quality = {
  __typename?: 'Quality';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  match: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  score: Scalars['Float']['output'];
  type: Entertainment;
  updatedAt: Scalars['DateTime']['output'];
};

export type QualityInput = {
  id: Scalars['Float']['input'];
  score: Scalars['Float']['input'];
};

export type Query = {
  __typename?: 'Query';
  discover: TmdbPaginatedResult;
  getCalendar: LibraryCalendar;
  getDownloadingMedias: Array<DownloadingMedia>;
  getGenres: TmdbGenresResults;
  getLanguages: Array<TmdbLanguagesResult>;
  getLibraryFolders: LibraryFoldersStatus;
  getMediaMounts: Array<MediaMount>;
  getMissingMovies: Array<EnrichedMovie>;
  getMissingTVEpisodes: Array<EnrichedTvEpisode>;
  getMovieFileDetails: LibraryFileDetails;
  getMovies: Array<EnrichedMovie>;
  getParams: ParamsHash;
  getPopular: TmdbSearchResults;
  getQualityParams: Array<Quality>;
  getRecommendedMovies: Array<TmdbSearchResult>;
  getRecommendedTVShows: Array<TmdbSearchResult>;
  getSearchingMedias: Array<SearchingMedia>;
  getTVSeasonDetails: Array<EnrichedTvEpisode>;
  getTVShowSeasons: Array<TmdbFormattedTvSeason>;
  getTVShows: Array<EnrichedTvShow>;
  getTags: Array<Tag>;
  getTorrentStatus: Array<TorrentStatus>;
  getWritableMediaMounts: Array<MediaMount>;
  omdbSearch: OmdbInfo;
  search: TmdbSearchResults;
  searchJackett: Array<JackettFormattedResult>;
};


export type QueryDiscoverArgs = {
  entertainment?: Entertainment;
  genres?: InputMaybe<Array<Scalars['Float']['input']>>;
  originLanguage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  primaryReleaseYear?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryGetMovieFileDetailsArgs = {
  tmdbId: Scalars['Int']['input'];
};


export type QueryGetQualityParamsArgs = {
  type: Entertainment;
};


export type QueryGetTvSeasonDetailsArgs = {
  seasonNumber: Scalars['Int']['input'];
  tvShowTMDBId: Scalars['Int']['input'];
};


export type QueryGetTvShowSeasonsArgs = {
  tvShowTMDBId: Scalars['Int']['input'];
};


export type QueryGetTorrentStatusArgs = {
  torrents: Array<GetTorrentStatusInput>;
};


export type QueryOmdbSearchArgs = {
  title: Scalars['String']['input'];
};


export type QuerySearchArgs = {
  query: Scalars['String']['input'];
};


export type QuerySearchJackettArgs = {
  query: Scalars['String']['input'];
};

export type Ratings = {
  __typename?: 'Ratings';
  IMDB?: Maybe<Scalars['String']['output']>;
  metaCritic?: Maybe<Scalars['String']['output']>;
  rottenTomatoes?: Maybe<Scalars['String']['output']>;
};

export type SearchingMedia = {
  __typename?: 'SearchingMedia';
  id: Scalars['String']['output'];
  resourceId: Scalars['Float']['output'];
  resourceType: FileType;
  title: Scalars['String']['output'];
};

export type TmdbFormattedTvEpisode = {
  __typename?: 'TMDBFormattedTVEpisode';
  airDate?: Maybe<Scalars['String']['output']>;
  episodeNumber: Scalars['Float']['output'];
  id: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  overview: Scalars['String']['output'];
  seasonNumber: Scalars['Float']['output'];
  stillPath?: Maybe<Scalars['String']['output']>;
  voteAverage?: Maybe<Scalars['Float']['output']>;
  voteCount?: Maybe<Scalars['Float']['output']>;
};

export type TmdbFormattedTvSeason = {
  __typename?: 'TMDBFormattedTVSeason';
  airDate?: Maybe<Scalars['String']['output']>;
  episodeCount?: Maybe<Scalars['Float']['output']>;
  episodes?: Maybe<Array<TmdbFormattedTvEpisode>>;
  id: Scalars['Float']['output'];
  inLibrary: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  overview?: Maybe<Scalars['String']['output']>;
  posterPath?: Maybe<Scalars['String']['output']>;
  seasonNumber: Scalars['Float']['output'];
};

export type TmdbGenresResult = {
  __typename?: 'TMDBGenresResult';
  id: Scalars['Float']['output'];
  name: Scalars['String']['output'];
};

export type TmdbGenresResults = {
  __typename?: 'TMDBGenresResults';
  movieGenres: Array<TmdbGenresResult>;
  tvShowGenres: Array<TmdbGenresResult>;
};

export type TmdbLanguagesResult = {
  __typename?: 'TMDBLanguagesResult';
  code: Scalars['String']['output'];
  language: Scalars['String']['output'];
};

export type TmdbPaginatedResult = {
  __typename?: 'TMDBPaginatedResult';
  page: Scalars['Float']['output'];
  results: Array<TmdbSearchResult>;
  totalPages: Scalars['Float']['output'];
  totalResults: Scalars['Float']['output'];
};

export type TmdbSearchResult = {
  __typename?: 'TMDBSearchResult';
  id: Scalars['Float']['output'];
  overview: Scalars['String']['output'];
  posterPath?: Maybe<Scalars['String']['output']>;
  releaseDate?: Maybe<Scalars['String']['output']>;
  runtime?: Maybe<Scalars['Float']['output']>;
  title: Scalars['String']['output'];
  tmdbId: Scalars['Float']['output'];
  voteAverage: Scalars['Float']['output'];
};

export type TmdbSearchResults = {
  __typename?: 'TMDBSearchResults';
  movies: Array<TmdbSearchResult>;
  tvShows: Array<TmdbSearchResult>;
};

export type TvShow = {
  __typename?: 'TVShow';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  title: Scalars['String']['output'];
  tmdbId: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Tag = {
  __typename?: 'Tag';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  score: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TagInput = {
  name: Scalars['String']['input'];
  score: Scalars['Float']['input'];
};

export type TorrentStatus = {
  __typename?: 'TorrentStatus';
  id: Scalars['Int']['output'];
  percentDone: Scalars['Float']['output'];
  rateDownload: Scalars['Int']['output'];
  rateUpload: Scalars['Int']['output'];
  resourceId: Scalars['Int']['output'];
  resourceType: FileType;
  status: Scalars['Int']['output'];
  totalSize: Scalars['BigInt']['output'];
  uploadRatio: Scalars['Float']['output'];
  uploadedEver: Scalars['BigInt']['output'];
};

export type UpdateParamsInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type ClearCacheMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearCacheMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadOwnTorrentMutationVariables = Exact<{
  mediaId: Scalars['Int']['input'];
  mediaType: FileType;
  torrent: Scalars['String']['input'];
}>;


export type DownloadOwnTorrentMutation = { __typename?: 'Mutation', downloadOwnTorrent: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type PauseTorrentsMutationVariables = Exact<{
  torrents: Array<ControlTorrentInput>;
}>;


export type PauseTorrentsMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type ResumeTorrentsMutationVariables = Exact<{
  torrents: Array<ControlTorrentInput>;
}>;


export type ResumeTorrentsMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type RemoveTorrentsMutationVariables = Exact<{
  torrents: Array<ControlTorrentInput>;
}>;


export type RemoveTorrentsMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type RemoveTorrentsAndFilesMutationVariables = Exact<{
  torrents: Array<ControlTorrentInput>;
}>;


export type RemoveTorrentsAndFilesMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type StartScanLibraryMutationVariables = Exact<{ [key: string]: never; }>;


export type StartScanLibraryMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type StartFindNewEpisodesMutationVariables = Exact<{ [key: string]: never; }>;


export type StartFindNewEpisodesMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type StartDownloadMissingMutationVariables = Exact<{ [key: string]: never; }>;


export type StartDownloadMissingMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadMovieMutationVariables = Exact<{
  movieId: Scalars['Int']['input'];
  jackettResult: JackettInput;
}>;


export type DownloadMovieMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadMovieWithQualityMutationVariables = Exact<{
  movieId: Scalars['Int']['input'];
  quality?: InputMaybe<Scalars['String']['input']>;
}>;


export type DownloadMovieWithQualityMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadEpisodeWithQualityMutationVariables = Exact<{
  episodeId: Scalars['Int']['input'];
  quality?: InputMaybe<Scalars['String']['input']>;
}>;


export type DownloadEpisodeWithQualityMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadSeasonWithQualityMutationVariables = Exact<{
  tvShowTMDBId: Scalars['Int']['input'];
  seasonNumber: Scalars['Int']['input'];
  quality?: InputMaybe<Scalars['String']['input']>;
}>;


export type DownloadSeasonWithQualityMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadTvEpisodeMutationVariables = Exact<{
  episodeId: Scalars['Int']['input'];
  jackettResult: JackettInput;
}>;


export type DownloadTvEpisodeMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type DownloadSeasonMutationVariables = Exact<{
  tvShowTMDBId: Scalars['Int']['input'];
  seasonNumber: Scalars['Int']['input'];
  jackettResult: JackettInput;
}>;


export type DownloadSeasonMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type RemoveMovieMutationVariables = Exact<{
  tmdbId: Scalars['Int']['input'];
}>;


export type RemoveMovieMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type RemoveTvShowMutationVariables = Exact<{
  tmdbId: Scalars['Int']['input'];
}>;


export type RemoveTvShowMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type ResetLibraryMutationVariables = Exact<{
  deleteFiles: Scalars['Boolean']['input'];
  resetSettings: Scalars['Boolean']['input'];
}>;


export type ResetLibraryMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type SaveQualityMutationVariables = Exact<{
  qualities: Array<QualityInput>;
}>;


export type SaveQualityMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type SaveTagsMutationVariables = Exact<{
  tags: Array<TagInput>;
}>;


export type SaveTagsMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type TrackMovieMutationVariables = Exact<{
  title: Scalars['String']['input'];
  tmdbId: Scalars['Int']['input'];
}>;


export type TrackMovieMutation = { __typename?: 'Mutation', movie: { __typename?: 'Movie', id: number } };

export type TrackTvShowMutationVariables = Exact<{
  tmdbId: Scalars['Int']['input'];
  seasonNumbers: Array<Scalars['Int']['input']>;
}>;


export type TrackTvShowMutation = { __typename?: 'Mutation', tvShow: { __typename?: 'TVShow', id: number } };

export type UpdateLibraryFoldersMutationVariables = Exact<{
  moviesFolderName: Scalars['String']['input'];
  moviesMountId?: InputMaybe<Scalars['Int']['input']>;
  tvShowsFolderName: Scalars['String']['input'];
  tvShowsMountId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type UpdateLibraryFoldersMutation = { __typename?: 'Mutation', libraryFolders: { __typename?: 'LibraryFoldersStatus', moviesMountId?: number | null, tvShowsMountId?: number | null, processUid?: number | null, processGid?: number | null, processRunsAsRoot: boolean, mount?: { __typename?: 'LibraryFolderStatus', type: string, name: string, path: string, state: LibraryFolderState, exists: boolean, isDirectory: boolean, canRead: boolean, canWrite: boolean, canTraverse: boolean, canCreate: boolean, mode?: string | null, ownerUid?: number | null, ownerGid?: number | null, message: string, remedy?: string | null } | null, folders: Array<{ __typename?: 'LibraryFolderStatus', type: string, name: string, path: string, state: LibraryFolderState, exists: boolean, isDirectory: boolean, canRead: boolean, canWrite: boolean, canTraverse: boolean, canCreate: boolean, mode?: string | null, ownerUid?: number | null, ownerGid?: number | null, message: string, remedy?: string | null }> } };

export type UpdateParamsMutationVariables = Exact<{
  params: Array<UpdateParamsInput>;
}>;


export type UpdateParamsMutation = { __typename?: 'Mutation', result: { __typename?: 'GraphQLCommonResponse', success: boolean, message?: string | null } };

export type GetCalendarQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCalendarQuery = { __typename?: 'Query', calendar: { __typename?: 'LibraryCalendar', movies: Array<{ __typename?: 'EnrichedMovie', id: number, title: string, state: DownloadableMediaState, releaseDate: string }>, tvEpisodes: Array<{ __typename?: 'EnrichedTVEpisode', id: number, episodeNumber: number, seasonNumber: number, state: DownloadableMediaState, releaseDate: string, tvShow: { __typename?: 'TVShow', id: number, title: string } }> } };

export type GetDiscoverQueryVariables = Exact<{
  entertainment?: InputMaybe<Entertainment>;
  originLanguage?: InputMaybe<Scalars['String']['input']>;
  primaryReleaseYear?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['Float']['input']>;
  genres?: InputMaybe<Array<Scalars['Float']['input']>>;
  page?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetDiscoverQuery = { __typename?: 'Query', TMDBResults: { __typename?: 'TMDBPaginatedResult', page: number, totalResults: number, totalPages: number, results: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number, releaseDate?: string | null }> } };

export type GetDownloadingQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDownloadingQuery = { __typename?: 'Query', searching: Array<{ __typename?: 'SearchingMedia', id: string, title: string, resourceId: number, resourceType: FileType }>, downloading: Array<{ __typename?: 'DownloadingMedia', id: string, title: string, tag: string, quality: string, torrent: string, resourceId: number, resourceType: FileType }> };

export type GetGenresQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGenresQuery = { __typename?: 'Query', genres: { __typename?: 'TMDBGenresResults', movieGenres: Array<{ __typename?: 'TMDBGenresResult', id: number, name: string }>, tvShowGenres: Array<{ __typename?: 'TMDBGenresResult', id: number, name: string }> } };

export type GetLanguagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLanguagesQuery = { __typename?: 'Query', languages: Array<{ __typename?: 'TMDBLanguagesResult', code: string, language: string }> };

export type GetLibraryFoldersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLibraryFoldersQuery = { __typename?: 'Query', libraryFolders: { __typename?: 'LibraryFoldersStatus', moviesMountId?: number | null, tvShowsMountId?: number | null, processUid?: number | null, processGid?: number | null, processRunsAsRoot: boolean, mount?: { __typename?: 'LibraryFolderStatus', type: string, name: string, path: string, state: LibraryFolderState, exists: boolean, isDirectory: boolean, canRead: boolean, canWrite: boolean, canTraverse: boolean, canCreate: boolean, mode?: string | null, ownerUid?: number | null, ownerGid?: number | null, message: string, remedy?: string | null } | null, folders: Array<{ __typename?: 'LibraryFolderStatus', type: string, name: string, path: string, state: LibraryFolderState, exists: boolean, isDirectory: boolean, canRead: boolean, canWrite: boolean, canTraverse: boolean, canCreate: boolean, mode?: string | null, ownerUid?: number | null, ownerGid?: number | null, message: string, remedy?: string | null }> } };

export type GetWritableMediaMountsQueryVariables = Exact<{ [key: string]: never; }>;

export type GetWritableMediaMountsQuery = { __typename?: 'Query', getWritableMediaMounts: Array<{ __typename?: 'MediaMount', id: number, label?: string | null, path: string, state: MediaMountState, accessType: MediaMountAccessType }> };

export type GetLibraryMoviesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLibraryMoviesQuery = { __typename?: 'Query', movies: Array<{ __typename?: 'EnrichedMovie', id: number, tmdbId: number, title: string, originalTitle?: string | null, state: DownloadableMediaState, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number, releaseDate: string, createdAt: any, updatedAt: any }> };

export type GetLibraryTvShowsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLibraryTvShowsQuery = { __typename?: 'Query', tvShows: Array<{ __typename?: 'EnrichedTVShow', id: number, tmdbId: number, title: string, originalTitle?: string | null, posterPath?: string | null, runtime?: number | null, overview: string, voteAverage: number, releaseDate: string, createdAt: any, updatedAt: any }> };

export type MissingTvEpisodesFragment = { __typename?: 'EnrichedTVEpisode', id: number, seasonNumber: number, episodeNumber: number, releaseDate: string, tvShow: { __typename?: 'TVShow', id: number, title: string } };

export type MissingMoviesFragment = { __typename?: 'EnrichedMovie', id: number, title: string, releaseDate: string };

export type GetMissingQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMissingQuery = { __typename?: 'Query', tvEpisodes: Array<{ __typename?: 'EnrichedTVEpisode', id: number, seasonNumber: number, episodeNumber: number, releaseDate: string, tvShow: { __typename?: 'TVShow', id: number, title: string } }>, movies: Array<{ __typename?: 'EnrichedMovie', id: number, title: string, releaseDate: string }> };

export type GetMovieFileDetailsQueryVariables = Exact<{
  tmdbId: Scalars['Int']['input'];
}>;


export type GetMovieFileDetailsQuery = { __typename?: 'Query', details: { __typename?: 'LibraryFileDetails', id: number, libraryPath: string, libraryFileSize?: any | null, torrentFileName?: string | null } };

export type GetParamsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetParamsQuery = { __typename?: 'Query', params: { __typename?: 'ParamsHash', region: string, language: string, tmdb_api_key: string, jackett_api_key: string, max_movie_download_size: string, max_tvshow_episode_download_size: string, organize_library_strategy: string } };

export type GetPopularQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPopularQuery = { __typename?: 'Query', results: { __typename?: 'TMDBSearchResults', movies: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, releaseDate?: string | null, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number }>, tvShows: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, releaseDate?: string | null, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number }> } };

export type GetQualityQueryVariables = Exact<{
  type: Entertainment;
}>;


export type GetQualityQuery = { __typename?: 'Query', qualities: Array<{ __typename?: 'Quality', id: number, name: string, match: Array<string>, score: number, updatedAt: any, createdAt: any, type: Entertainment }> };

export type GetRecommendedQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRecommendedQuery = { __typename?: 'Query', tvShows: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, releaseDate?: string | null, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number }>, movies: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, releaseDate?: string | null, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number }> };

export type GetTagsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTagsQuery = { __typename?: 'Query', tags: Array<{ __typename?: 'Tag', id: number, name: string, score: number, createdAt: any, updatedAt: any }> };

export type GetTorrentStatusQueryVariables = Exact<{
  torrents: Array<GetTorrentStatusInput>;
}>;


export type GetTorrentStatusQuery = { __typename?: 'Query', torrents: Array<{ __typename?: 'TorrentStatus', id: number, resourceId: number, resourceType: FileType, percentDone: number, rateDownload: number, rateUpload: number, uploadRatio: number, uploadedEver: any, totalSize: any, status: number }> };

export type GetTvSeasonDetailsQueryVariables = Exact<{
  tvShowTMDBId: Scalars['Int']['input'];
  seasonNumber: Scalars['Int']['input'];
}>;


export type GetTvSeasonDetailsQuery = { __typename?: 'Query', episodes: Array<{ __typename?: 'EnrichedTVEpisode', id: number, episodeNumber: number, seasonNumber: number, state: DownloadableMediaState, updatedAt: any, voteAverage?: number | null, releaseDate: string, createdAt: any, tvShow: { __typename?: 'TVShow', id: number, title: string, tmdbId: number, updatedAt: any, createdAt: any } }> };

export type GetTvShowSeasonsQueryVariables = Exact<{
  tvShowTMDBId: Scalars['Int']['input'];
}>;


export type GetTvShowSeasonsQuery = { __typename?: 'Query', seasons: Array<{ __typename?: 'TMDBFormattedTVSeason', id: number, name: string, seasonNumber: number, episodeCount?: number | null, overview?: string | null, posterPath?: string | null, airDate?: string | null, inLibrary: boolean }> };

export type OmdbSearchQueryVariables = Exact<{
  title: Scalars['String']['input'];
}>;


export type OmdbSearchQuery = { __typename?: 'Query', result: { __typename?: 'OMDBInfo', ratings: { __typename?: 'Ratings', IMDB?: string | null, rottenTomatoes?: string | null, metaCritic?: string | null } } };

export type SearchTorrentQueryVariables = Exact<{
  query: Scalars['String']['input'];
  quality?: InputMaybe<Scalars['String']['input']>;
}>;


export type SearchTorrentQuery = { __typename?: 'Query', results: Array<{ __typename?: 'JackettFormattedResult', id: string, title: string, quality: string, qualityScore: number, seeders: number, peers: number, link: string, downloadLink: string, tag: string, tagScore: number, normalizedTitle: string, normalizedTitleParts: Array<string>, size: any, publishDate: string }> };

export type SearchQueryVariables = Exact<{
  query: Scalars['String']['input'];
}>;


export type SearchQuery = { __typename?: 'Query', results: { __typename?: 'TMDBSearchResults', movies: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, releaseDate?: string | null, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number }>, tvShows: Array<{ __typename?: 'TMDBSearchResult', id: number, tmdbId: number, title: string, releaseDate?: string | null, posterPath?: string | null, overview: string, runtime?: number | null, voteAverage: number }> } };

export const MissingTvEpisodesFragmentDoc = gql`
    fragment MissingTVEpisodes on EnrichedTVEpisode {
  id
  seasonNumber
  episodeNumber
  releaseDate
  tvShow {
    id
    title
  }
}
    `;
export const MissingMoviesFragmentDoc = gql`
    fragment MissingMovies on EnrichedMovie {
  id
  title
  releaseDate
}
    `;
export const ClearCacheDocument = gql`
    mutation clearCache {
  result: clearRedisCache {
    success
    message
  }
}
    `;
export function useClearCacheMutation(baseOptions?: Apollo.MutationHookOptions<ClearCacheMutation, ClearCacheMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ClearCacheMutation, ClearCacheMutationVariables>(ClearCacheDocument, options);
      }
export type ClearCacheMutationHookResult = ReturnType<typeof useClearCacheMutation>;
export type ClearCacheMutationResult = Apollo.MutationResult<ClearCacheMutation>;
export type ClearCacheMutationOptions = Apollo.BaseMutationOptions<ClearCacheMutation, ClearCacheMutationVariables>;
export const DownloadOwnTorrentDocument = gql`
    mutation downloadOwnTorrent($mediaId: Int!, $mediaType: FileType!, $torrent: String!) {
  downloadOwnTorrent(mediaId: $mediaId, mediaType: $mediaType, torrent: $torrent) {
    success
    message
  }
}
    `;
export function useDownloadOwnTorrentMutation(baseOptions?: Apollo.MutationHookOptions<DownloadOwnTorrentMutation, DownloadOwnTorrentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadOwnTorrentMutation, DownloadOwnTorrentMutationVariables>(DownloadOwnTorrentDocument, options);
      }
export type DownloadOwnTorrentMutationHookResult = ReturnType<typeof useDownloadOwnTorrentMutation>;
export type DownloadOwnTorrentMutationResult = Apollo.MutationResult<DownloadOwnTorrentMutation>;
export type DownloadOwnTorrentMutationOptions = Apollo.BaseMutationOptions<DownloadOwnTorrentMutation, DownloadOwnTorrentMutationVariables>;
export const PauseTorrentsDocument = gql`
    mutation pauseTorrents($torrents: [ControlTorrentInput!]!) {
  result: pauseTorrents(torrents: $torrents) {
    success
    message
  }
}
    `;
export function usePauseTorrentsMutation(baseOptions?: Apollo.MutationHookOptions<PauseTorrentsMutation, PauseTorrentsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PauseTorrentsMutation, PauseTorrentsMutationVariables>(PauseTorrentsDocument, options);
      }
export type PauseTorrentsMutationHookResult = ReturnType<typeof usePauseTorrentsMutation>;
export type PauseTorrentsMutationResult = Apollo.MutationResult<PauseTorrentsMutation>;
export type PauseTorrentsMutationOptions = Apollo.BaseMutationOptions<PauseTorrentsMutation, PauseTorrentsMutationVariables>;
export const ResumeTorrentsDocument = gql`
    mutation resumeTorrents($torrents: [ControlTorrentInput!]!) {
  result: resumeTorrents(torrents: $torrents) {
    success
    message
  }
}
    `;
export function useResumeTorrentsMutation(baseOptions?: Apollo.MutationHookOptions<ResumeTorrentsMutation, ResumeTorrentsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResumeTorrentsMutation, ResumeTorrentsMutationVariables>(ResumeTorrentsDocument, options);
      }
export type ResumeTorrentsMutationHookResult = ReturnType<typeof useResumeTorrentsMutation>;
export type ResumeTorrentsMutationResult = Apollo.MutationResult<ResumeTorrentsMutation>;
export type ResumeTorrentsMutationOptions = Apollo.BaseMutationOptions<ResumeTorrentsMutation, ResumeTorrentsMutationVariables>;
export const RemoveTorrentsDocument = gql`
    mutation removeTorrents($torrents: [ControlTorrentInput!]!) {
  result: removeTorrents(torrents: $torrents) {
    success
    message
  }
}
    `;
export function useRemoveTorrentsMutation(baseOptions?: Apollo.MutationHookOptions<RemoveTorrentsMutation, RemoveTorrentsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveTorrentsMutation, RemoveTorrentsMutationVariables>(RemoveTorrentsDocument, options);
      }
export type RemoveTorrentsMutationHookResult = ReturnType<typeof useRemoveTorrentsMutation>;
export type RemoveTorrentsMutationResult = Apollo.MutationResult<RemoveTorrentsMutation>;
export type RemoveTorrentsMutationOptions = Apollo.BaseMutationOptions<RemoveTorrentsMutation, RemoveTorrentsMutationVariables>;
export const RemoveTorrentsAndFilesDocument = gql`
    mutation removeTorrentsAndFiles($torrents: [ControlTorrentInput!]!) {
  result: removeTorrentsAndFiles(torrents: $torrents) {
    success
    message
  }
}
    `;
export function useRemoveTorrentsAndFilesMutation(baseOptions?: Apollo.MutationHookOptions<RemoveTorrentsAndFilesMutation, RemoveTorrentsAndFilesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveTorrentsAndFilesMutation, RemoveTorrentsAndFilesMutationVariables>(RemoveTorrentsAndFilesDocument, options);
      }
export type RemoveTorrentsAndFilesMutationHookResult = ReturnType<typeof useRemoveTorrentsAndFilesMutation>;
export type RemoveTorrentsAndFilesMutationResult = Apollo.MutationResult<RemoveTorrentsAndFilesMutation>;
export type RemoveTorrentsAndFilesMutationOptions = Apollo.BaseMutationOptions<RemoveTorrentsAndFilesMutation, RemoveTorrentsAndFilesMutationVariables>;
export const StartScanLibraryDocument = gql`
    mutation startScanLibrary {
  result: startScanLibraryJob {
    success
    message
  }
}
    `;
export function useStartScanLibraryMutation(baseOptions?: Apollo.MutationHookOptions<StartScanLibraryMutation, StartScanLibraryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StartScanLibraryMutation, StartScanLibraryMutationVariables>(StartScanLibraryDocument, options);
      }
export type StartScanLibraryMutationHookResult = ReturnType<typeof useStartScanLibraryMutation>;
export type StartScanLibraryMutationResult = Apollo.MutationResult<StartScanLibraryMutation>;
export type StartScanLibraryMutationOptions = Apollo.BaseMutationOptions<StartScanLibraryMutation, StartScanLibraryMutationVariables>;
export const StartFindNewEpisodesDocument = gql`
    mutation startFindNewEpisodes {
  result: startFindNewEpisodesJob {
    success
    message
  }
}
    `;
export function useStartFindNewEpisodesMutation(baseOptions?: Apollo.MutationHookOptions<StartFindNewEpisodesMutation, StartFindNewEpisodesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StartFindNewEpisodesMutation, StartFindNewEpisodesMutationVariables>(StartFindNewEpisodesDocument, options);
      }
export type StartFindNewEpisodesMutationHookResult = ReturnType<typeof useStartFindNewEpisodesMutation>;
export type StartFindNewEpisodesMutationResult = Apollo.MutationResult<StartFindNewEpisodesMutation>;
export type StartFindNewEpisodesMutationOptions = Apollo.BaseMutationOptions<StartFindNewEpisodesMutation, StartFindNewEpisodesMutationVariables>;
export const StartDownloadMissingDocument = gql`
    mutation startDownloadMissing {
  result: startDownloadMissingJob {
    success
    message
  }
}
    `;
export function useStartDownloadMissingMutation(baseOptions?: Apollo.MutationHookOptions<StartDownloadMissingMutation, StartDownloadMissingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StartDownloadMissingMutation, StartDownloadMissingMutationVariables>(StartDownloadMissingDocument, options);
      }
export type StartDownloadMissingMutationHookResult = ReturnType<typeof useStartDownloadMissingMutation>;
export type StartDownloadMissingMutationResult = Apollo.MutationResult<StartDownloadMissingMutation>;
export type StartDownloadMissingMutationOptions = Apollo.BaseMutationOptions<StartDownloadMissingMutation, StartDownloadMissingMutationVariables>;
export const DownloadMovieDocument = gql`
    mutation downloadMovie($movieId: Int!, $jackettResult: JackettInput!) {
  result: downloadMovie(movieId: $movieId, jackettResult: $jackettResult) {
    success
    message
  }
}
    `;
export function useDownloadMovieMutation(baseOptions?: Apollo.MutationHookOptions<DownloadMovieMutation, DownloadMovieMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadMovieMutation, DownloadMovieMutationVariables>(DownloadMovieDocument, options);
      }
export type DownloadMovieMutationHookResult = ReturnType<typeof useDownloadMovieMutation>;
export type DownloadMovieMutationResult = Apollo.MutationResult<DownloadMovieMutation>;
export type DownloadMovieMutationOptions = Apollo.BaseMutationOptions<DownloadMovieMutation, DownloadMovieMutationVariables>;
export const DownloadTvEpisodeDocument = gql`
    mutation downloadTVEpisode($episodeId: Int!, $jackettResult: JackettInput!) {
  result: downloadTVEpisode(episodeId: $episodeId, jackettResult: $jackettResult) {
    success
    message
  }
}
    `;
export function useDownloadTvEpisodeMutation(baseOptions?: Apollo.MutationHookOptions<DownloadTvEpisodeMutation, DownloadTvEpisodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadTvEpisodeMutation, DownloadTvEpisodeMutationVariables>(DownloadTvEpisodeDocument, options);
      }
export type DownloadTvEpisodeMutationHookResult = ReturnType<typeof useDownloadTvEpisodeMutation>;
export type DownloadTvEpisodeMutationResult = Apollo.MutationResult<DownloadTvEpisodeMutation>;
export type DownloadTvEpisodeMutationOptions = Apollo.BaseMutationOptions<DownloadTvEpisodeMutation, DownloadTvEpisodeMutationVariables>;
export const DownloadSeasonDocument = gql`
    mutation downloadSeason($tvShowTMDBId: Int!, $seasonNumber: Int!, $jackettResult: JackettInput!) {
  result: downloadSeason(
    tvShowTMDBId: $tvShowTMDBId
    seasonNumber: $seasonNumber
    jackettResult: $jackettResult
  ) {
    success
    message
  }
}
    `;
export function useDownloadSeasonMutation(baseOptions?: Apollo.MutationHookOptions<DownloadSeasonMutation, DownloadSeasonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadSeasonMutation, DownloadSeasonMutationVariables>(DownloadSeasonDocument, options);
      }
export type DownloadSeasonMutationHookResult = ReturnType<typeof useDownloadSeasonMutation>;
export type DownloadSeasonMutationResult = Apollo.MutationResult<DownloadSeasonMutation>;
export type DownloadSeasonMutationOptions = Apollo.BaseMutationOptions<DownloadSeasonMutation, DownloadSeasonMutationVariables>;
export const DownloadMovieWithQualityDocument = gql`
    mutation downloadMovieWithQuality($movieId: Int!, $quality: String) {
  result: downloadMovieWithQuality(movieId: $movieId, quality: $quality) {
    success
    message
  }
}
    `;
export function useDownloadMovieWithQualityMutation(baseOptions?: Apollo.MutationHookOptions<DownloadMovieWithQualityMutation, DownloadMovieWithQualityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadMovieWithQualityMutation, DownloadMovieWithQualityMutationVariables>(DownloadMovieWithQualityDocument, options);
      }
export type DownloadMovieWithQualityMutationHookResult = ReturnType<typeof useDownloadMovieWithQualityMutation>;
export type DownloadMovieWithQualityMutationResult = Apollo.MutationResult<DownloadMovieWithQualityMutation>;
export type DownloadMovieWithQualityMutationOptions = Apollo.BaseMutationOptions<DownloadMovieWithQualityMutation, DownloadMovieWithQualityMutationVariables>;
export const DownloadEpisodeWithQualityDocument = gql`
    mutation downloadEpisodeWithQuality($episodeId: Int!, $quality: String) {
  result: downloadEpisodeWithQuality(episodeId: $episodeId, quality: $quality) {
    success
    message
  }
}
    `;
export function useDownloadEpisodeWithQualityMutation(baseOptions?: Apollo.MutationHookOptions<DownloadEpisodeWithQualityMutation, DownloadEpisodeWithQualityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadEpisodeWithQualityMutation, DownloadEpisodeWithQualityMutationVariables>(DownloadEpisodeWithQualityDocument, options);
      }
export type DownloadEpisodeWithQualityMutationHookResult = ReturnType<typeof useDownloadEpisodeWithQualityMutation>;
export type DownloadEpisodeWithQualityMutationResult = Apollo.MutationResult<DownloadEpisodeWithQualityMutation>;
export type DownloadEpisodeWithQualityMutationOptions = Apollo.BaseMutationOptions<DownloadEpisodeWithQualityMutation, DownloadEpisodeWithQualityMutationVariables>;
export const DownloadSeasonWithQualityDocument = gql`
    mutation downloadSeasonWithQuality($tvShowTMDBId: Int!, $seasonNumber: Int!, $quality: String) {
  result: downloadSeasonWithQuality(
    tvShowTMDBId: $tvShowTMDBId
    seasonNumber: $seasonNumber
    quality: $quality
  ) {
    success
    message
  }
}
    `;
export function useDownloadSeasonWithQualityMutation(baseOptions?: Apollo.MutationHookOptions<DownloadSeasonWithQualityMutation, DownloadSeasonWithQualityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DownloadSeasonWithQualityMutation, DownloadSeasonWithQualityMutationVariables>(DownloadSeasonWithQualityDocument, options);
      }
export type DownloadSeasonWithQualityMutationHookResult = ReturnType<typeof useDownloadSeasonWithQualityMutation>;
export type DownloadSeasonWithQualityMutationResult = Apollo.MutationResult<DownloadSeasonWithQualityMutation>;
export type DownloadSeasonWithQualityMutationOptions = Apollo.BaseMutationOptions<DownloadSeasonWithQualityMutation, DownloadSeasonWithQualityMutationVariables>;
export const RemoveMovieDocument = gql`
    mutation removeMovie($tmdbId: Int!) {
  result: removeMovie(tmdbId: $tmdbId) {
    success
    message
  }
}
    `;
export function useRemoveMovieMutation(baseOptions?: Apollo.MutationHookOptions<RemoveMovieMutation, RemoveMovieMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveMovieMutation, RemoveMovieMutationVariables>(RemoveMovieDocument, options);
      }
export type RemoveMovieMutationHookResult = ReturnType<typeof useRemoveMovieMutation>;
export type RemoveMovieMutationResult = Apollo.MutationResult<RemoveMovieMutation>;
export type RemoveMovieMutationOptions = Apollo.BaseMutationOptions<RemoveMovieMutation, RemoveMovieMutationVariables>;
export const RemoveTvShowDocument = gql`
    mutation removeTVShow($tmdbId: Int!) {
  result: removeTVShow(tmdbId: $tmdbId) {
    success
    message
  }
}
    `;
export function useRemoveTvShowMutation(baseOptions?: Apollo.MutationHookOptions<RemoveTvShowMutation, RemoveTvShowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveTvShowMutation, RemoveTvShowMutationVariables>(RemoveTvShowDocument, options);
      }
export type RemoveTvShowMutationHookResult = ReturnType<typeof useRemoveTvShowMutation>;
export type RemoveTvShowMutationResult = Apollo.MutationResult<RemoveTvShowMutation>;
export type RemoveTvShowMutationOptions = Apollo.BaseMutationOptions<RemoveTvShowMutation, RemoveTvShowMutationVariables>;
export const ResetLibraryDocument = gql`
    mutation resetLibrary($deleteFiles: Boolean!, $resetSettings: Boolean!) {
  result: resetLibrary(deleteFiles: $deleteFiles, resetSettings: $resetSettings) {
    success
    message
  }
}
    `;
export function useResetLibraryMutation(baseOptions?: Apollo.MutationHookOptions<ResetLibraryMutation, ResetLibraryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetLibraryMutation, ResetLibraryMutationVariables>(ResetLibraryDocument, options);
      }
export type ResetLibraryMutationHookResult = ReturnType<typeof useResetLibraryMutation>;
export type ResetLibraryMutationResult = Apollo.MutationResult<ResetLibraryMutation>;
export type ResetLibraryMutationOptions = Apollo.BaseMutationOptions<ResetLibraryMutation, ResetLibraryMutationVariables>;
export const SaveQualityDocument = gql`
    mutation saveQuality($qualities: [QualityInput!]!) {
  result: saveQualityParams(qualities: $qualities) {
    success
    message
  }
}
    `;
export function useSaveQualityMutation(baseOptions?: Apollo.MutationHookOptions<SaveQualityMutation, SaveQualityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveQualityMutation, SaveQualityMutationVariables>(SaveQualityDocument, options);
      }
export type SaveQualityMutationHookResult = ReturnType<typeof useSaveQualityMutation>;
export type SaveQualityMutationResult = Apollo.MutationResult<SaveQualityMutation>;
export type SaveQualityMutationOptions = Apollo.BaseMutationOptions<SaveQualityMutation, SaveQualityMutationVariables>;
export const SaveTagsDocument = gql`
    mutation saveTags($tags: [TagInput!]!) {
  result: saveTags(tags: $tags) {
    success
    message
  }
}
    `;
export function useSaveTagsMutation(baseOptions?: Apollo.MutationHookOptions<SaveTagsMutation, SaveTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveTagsMutation, SaveTagsMutationVariables>(SaveTagsDocument, options);
      }
export type SaveTagsMutationHookResult = ReturnType<typeof useSaveTagsMutation>;
export type SaveTagsMutationResult = Apollo.MutationResult<SaveTagsMutation>;
export type SaveTagsMutationOptions = Apollo.BaseMutationOptions<SaveTagsMutation, SaveTagsMutationVariables>;
export const TrackMovieDocument = gql`
    mutation trackMovie($title: String!, $tmdbId: Int!) {
  movie: trackMovie(title: $title, tmdbId: $tmdbId) {
    id
  }
}
    `;
export function useTrackMovieMutation(baseOptions?: Apollo.MutationHookOptions<TrackMovieMutation, TrackMovieMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TrackMovieMutation, TrackMovieMutationVariables>(TrackMovieDocument, options);
      }
export type TrackMovieMutationHookResult = ReturnType<typeof useTrackMovieMutation>;
export type TrackMovieMutationResult = Apollo.MutationResult<TrackMovieMutation>;
export type TrackMovieMutationOptions = Apollo.BaseMutationOptions<TrackMovieMutation, TrackMovieMutationVariables>;
export const TrackTvShowDocument = gql`
    mutation trackTVShow($tmdbId: Int!, $seasonNumbers: [Int!]!) {
  tvShow: trackTVShow(tmdbId: $tmdbId, seasonNumbers: $seasonNumbers) {
    id
  }
}
    `;
export function useTrackTvShowMutation(baseOptions?: Apollo.MutationHookOptions<TrackTvShowMutation, TrackTvShowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TrackTvShowMutation, TrackTvShowMutationVariables>(TrackTvShowDocument, options);
      }
export type TrackTvShowMutationHookResult = ReturnType<typeof useTrackTvShowMutation>;
export type TrackTvShowMutationResult = Apollo.MutationResult<TrackTvShowMutation>;
export type TrackTvShowMutationOptions = Apollo.BaseMutationOptions<TrackTvShowMutation, TrackTvShowMutationVariables>;
export const UpdateLibraryFoldersDocument = gql`
    mutation updateLibraryFolders($moviesFolderName: String!, $tvShowsFolderName: String!, $moviesMountId: Int, $tvShowsMountId: Int) {
  libraryFolders: updateLibraryFolders(
    moviesFolderName: $moviesFolderName
    tvShowsFolderName: $tvShowsFolderName
    moviesMountId: $moviesMountId
    tvShowsMountId: $tvShowsMountId
  ) {
    mount {
      type
      name
      path
      state
      exists
      isDirectory
      canRead
      canWrite
      canTraverse
      canCreate
      mode
      ownerUid
      ownerGid
      message
      remedy
    }
    moviesMountId
    tvShowsMountId
    processUid
    processGid
    processRunsAsRoot
    folders {
      type
      name
      path
      state
      exists
      isDirectory
      canRead
      canWrite
      canTraverse
      canCreate
      mode
      ownerUid
      ownerGid
      message
      remedy
    }
  }
}
    `;
export function useUpdateLibraryFoldersMutation(baseOptions?: Apollo.MutationHookOptions<UpdateLibraryFoldersMutation, UpdateLibraryFoldersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateLibraryFoldersMutation, UpdateLibraryFoldersMutationVariables>(UpdateLibraryFoldersDocument, options);
      }
export type UpdateLibraryFoldersMutationHookResult = ReturnType<typeof useUpdateLibraryFoldersMutation>;
export type UpdateLibraryFoldersMutationResult = Apollo.MutationResult<UpdateLibraryFoldersMutation>;
export type UpdateLibraryFoldersMutationOptions = Apollo.BaseMutationOptions<UpdateLibraryFoldersMutation, UpdateLibraryFoldersMutationVariables>;
export const UpdateParamsDocument = gql`
    mutation updateParams($params: [UpdateParamsInput!]!) {
  result: updateParams(params: $params) {
    success
    message
  }
}
    `;
export function useUpdateParamsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateParamsMutation, UpdateParamsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateParamsMutation, UpdateParamsMutationVariables>(UpdateParamsDocument, options);
      }
export type UpdateParamsMutationHookResult = ReturnType<typeof useUpdateParamsMutation>;
export type UpdateParamsMutationResult = Apollo.MutationResult<UpdateParamsMutation>;
export type UpdateParamsMutationOptions = Apollo.BaseMutationOptions<UpdateParamsMutation, UpdateParamsMutationVariables>;
export const GetCalendarDocument = gql`
    query getCalendar {
  calendar: getCalendar {
    movies {
      id
      title
      state
      releaseDate
    }
    tvEpisodes {
      id
      tvShow {
        id
        title
      }
      episodeNumber
      seasonNumber
      state
      releaseDate
    }
  }
}
    `;
export function useGetCalendarQuery(baseOptions?: Apollo.QueryHookOptions<GetCalendarQuery, GetCalendarQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCalendarQuery, GetCalendarQueryVariables>(GetCalendarDocument, options);
      }
export function useGetCalendarLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCalendarQuery, GetCalendarQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCalendarQuery, GetCalendarQueryVariables>(GetCalendarDocument, options);
        }
// @ts-ignore
export function useGetCalendarSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCalendarQuery, GetCalendarQueryVariables>): Apollo.UseSuspenseQueryResult<GetCalendarQuery, GetCalendarQueryVariables>;
export function useGetCalendarSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCalendarQuery, GetCalendarQueryVariables>): Apollo.UseSuspenseQueryResult<GetCalendarQuery | undefined, GetCalendarQueryVariables>;
export function useGetCalendarSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCalendarQuery, GetCalendarQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCalendarQuery, GetCalendarQueryVariables>(GetCalendarDocument, options);
        }
export type GetCalendarQueryHookResult = ReturnType<typeof useGetCalendarQuery>;
export type GetCalendarLazyQueryHookResult = ReturnType<typeof useGetCalendarLazyQuery>;
export type GetCalendarSuspenseQueryHookResult = ReturnType<typeof useGetCalendarSuspenseQuery>;
export type GetCalendarQueryResult = Apollo.QueryResult<GetCalendarQuery, GetCalendarQueryVariables>;
export const GetDiscoverDocument = gql`
    query getDiscover($entertainment: Entertainment, $originLanguage: String, $primaryReleaseYear: String, $score: Float, $genres: [Float!], $page: Float) {
  TMDBResults: discover(
    entertainment: $entertainment
    originLanguage: $originLanguage
    primaryReleaseYear: $primaryReleaseYear
    score: $score
    genres: $genres
    page: $page
  ) {
    page
    totalResults
    totalPages
    results {
      id
      tmdbId
      title
      posterPath
      overview
      runtime
      voteAverage
      releaseDate
    }
  }
}
    `;
export function useGetDiscoverQuery(baseOptions?: Apollo.QueryHookOptions<GetDiscoverQuery, GetDiscoverQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDiscoverQuery, GetDiscoverQueryVariables>(GetDiscoverDocument, options);
      }
export function useGetDiscoverLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDiscoverQuery, GetDiscoverQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDiscoverQuery, GetDiscoverQueryVariables>(GetDiscoverDocument, options);
        }
// @ts-ignore
export function useGetDiscoverSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDiscoverQuery, GetDiscoverQueryVariables>): Apollo.UseSuspenseQueryResult<GetDiscoverQuery, GetDiscoverQueryVariables>;
export function useGetDiscoverSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDiscoverQuery, GetDiscoverQueryVariables>): Apollo.UseSuspenseQueryResult<GetDiscoverQuery | undefined, GetDiscoverQueryVariables>;
export function useGetDiscoverSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDiscoverQuery, GetDiscoverQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDiscoverQuery, GetDiscoverQueryVariables>(GetDiscoverDocument, options);
        }
export type GetDiscoverQueryHookResult = ReturnType<typeof useGetDiscoverQuery>;
export type GetDiscoverLazyQueryHookResult = ReturnType<typeof useGetDiscoverLazyQuery>;
export type GetDiscoverSuspenseQueryHookResult = ReturnType<typeof useGetDiscoverSuspenseQuery>;
export type GetDiscoverQueryResult = Apollo.QueryResult<GetDiscoverQuery, GetDiscoverQueryVariables>;
export const GetDownloadingDocument = gql`
    query getDownloading {
  searching: getSearchingMedias {
    id
    title
    resourceId
    resourceType
  }
  downloading: getDownloadingMedias {
    id
    title
    tag
    quality
    torrent
    resourceId
    resourceType
  }
}
    `;
export function useGetDownloadingQuery(baseOptions?: Apollo.QueryHookOptions<GetDownloadingQuery, GetDownloadingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDownloadingQuery, GetDownloadingQueryVariables>(GetDownloadingDocument, options);
      }
export function useGetDownloadingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDownloadingQuery, GetDownloadingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDownloadingQuery, GetDownloadingQueryVariables>(GetDownloadingDocument, options);
        }
// @ts-ignore
export function useGetDownloadingSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDownloadingQuery, GetDownloadingQueryVariables>): Apollo.UseSuspenseQueryResult<GetDownloadingQuery, GetDownloadingQueryVariables>;
export function useGetDownloadingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDownloadingQuery, GetDownloadingQueryVariables>): Apollo.UseSuspenseQueryResult<GetDownloadingQuery | undefined, GetDownloadingQueryVariables>;
export function useGetDownloadingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDownloadingQuery, GetDownloadingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDownloadingQuery, GetDownloadingQueryVariables>(GetDownloadingDocument, options);
        }
export type GetDownloadingQueryHookResult = ReturnType<typeof useGetDownloadingQuery>;
export type GetDownloadingLazyQueryHookResult = ReturnType<typeof useGetDownloadingLazyQuery>;
export type GetDownloadingSuspenseQueryHookResult = ReturnType<typeof useGetDownloadingSuspenseQuery>;
export type GetDownloadingQueryResult = Apollo.QueryResult<GetDownloadingQuery, GetDownloadingQueryVariables>;
export const GetGenresDocument = gql`
    query getGenres {
  genres: getGenres {
    movieGenres {
      id
      name
    }
    tvShowGenres {
      id
      name
    }
  }
}
    `;
export function useGetGenresQuery(baseOptions?: Apollo.QueryHookOptions<GetGenresQuery, GetGenresQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGenresQuery, GetGenresQueryVariables>(GetGenresDocument, options);
      }
export function useGetGenresLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGenresQuery, GetGenresQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGenresQuery, GetGenresQueryVariables>(GetGenresDocument, options);
        }
// @ts-ignore
export function useGetGenresSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGenresQuery, GetGenresQueryVariables>): Apollo.UseSuspenseQueryResult<GetGenresQuery, GetGenresQueryVariables>;
export function useGetGenresSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGenresQuery, GetGenresQueryVariables>): Apollo.UseSuspenseQueryResult<GetGenresQuery | undefined, GetGenresQueryVariables>;
export function useGetGenresSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGenresQuery, GetGenresQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGenresQuery, GetGenresQueryVariables>(GetGenresDocument, options);
        }
export type GetGenresQueryHookResult = ReturnType<typeof useGetGenresQuery>;
export type GetGenresLazyQueryHookResult = ReturnType<typeof useGetGenresLazyQuery>;
export type GetGenresSuspenseQueryHookResult = ReturnType<typeof useGetGenresSuspenseQuery>;
export type GetGenresQueryResult = Apollo.QueryResult<GetGenresQuery, GetGenresQueryVariables>;
export const GetLanguagesDocument = gql`
    query getLanguages {
  languages: getLanguages {
    code
    language
  }
}
    `;
export function useGetLanguagesQuery(baseOptions?: Apollo.QueryHookOptions<GetLanguagesQuery, GetLanguagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLanguagesQuery, GetLanguagesQueryVariables>(GetLanguagesDocument, options);
      }
export function useGetLanguagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLanguagesQuery, GetLanguagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLanguagesQuery, GetLanguagesQueryVariables>(GetLanguagesDocument, options);
        }
// @ts-ignore
export function useGetLanguagesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLanguagesQuery, GetLanguagesQueryVariables>): Apollo.UseSuspenseQueryResult<GetLanguagesQuery, GetLanguagesQueryVariables>;
export function useGetLanguagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLanguagesQuery, GetLanguagesQueryVariables>): Apollo.UseSuspenseQueryResult<GetLanguagesQuery | undefined, GetLanguagesQueryVariables>;
export function useGetLanguagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLanguagesQuery, GetLanguagesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLanguagesQuery, GetLanguagesQueryVariables>(GetLanguagesDocument, options);
        }
export type GetLanguagesQueryHookResult = ReturnType<typeof useGetLanguagesQuery>;
export type GetLanguagesLazyQueryHookResult = ReturnType<typeof useGetLanguagesLazyQuery>;
export type GetLanguagesSuspenseQueryHookResult = ReturnType<typeof useGetLanguagesSuspenseQuery>;
export type GetLanguagesQueryResult = Apollo.QueryResult<GetLanguagesQuery, GetLanguagesQueryVariables>;
export const GetLibraryFoldersDocument = gql`
    query getLibraryFolders {
  libraryFolders: getLibraryFolders {
    mount {
      type
      name
      path
      state
      exists
      isDirectory
      canRead
      canWrite
      canTraverse
      canCreate
      mode
      ownerUid
      ownerGid
      message
      remedy
    }
    moviesMountId
    tvShowsMountId
    processUid
    processGid
    processRunsAsRoot
    folders {
      type
      name
      path
      state
      exists
      isDirectory
      canRead
      canWrite
      canTraverse
      canCreate
      mode
      ownerUid
      ownerGid
      message
      remedy
    }
  }
}
    `;
export function useGetLibraryFoldersQuery(baseOptions?: Apollo.QueryHookOptions<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>(GetLibraryFoldersDocument, options);
      }
export function useGetLibraryFoldersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>(GetLibraryFoldersDocument, options);
        }
// @ts-ignore
export function useGetLibraryFoldersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>): Apollo.UseSuspenseQueryResult<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>;
export function useGetLibraryFoldersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>): Apollo.UseSuspenseQueryResult<GetLibraryFoldersQuery | undefined, GetLibraryFoldersQueryVariables>;
export function useGetLibraryFoldersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>(GetLibraryFoldersDocument, options);
        }
export type GetLibraryFoldersQueryHookResult = ReturnType<typeof useGetLibraryFoldersQuery>;
export type GetLibraryFoldersLazyQueryHookResult = ReturnType<typeof useGetLibraryFoldersLazyQuery>;
export type GetLibraryFoldersSuspenseQueryHookResult = ReturnType<typeof useGetLibraryFoldersSuspenseQuery>;
export type GetLibraryFoldersQueryResult = Apollo.QueryResult<GetLibraryFoldersQuery, GetLibraryFoldersQueryVariables>;

export const GetWritableMediaMountsDocument = gql`
    query getWritableMediaMounts {
  getWritableMediaMounts {
    id
    label
    path
    state
    accessType
  }
}
    `;
export function useGetWritableMediaMountsQuery(baseOptions?: Apollo.QueryHookOptions<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>(GetWritableMediaMountsDocument, options);
      }
export function useGetWritableMediaMountsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>(GetWritableMediaMountsDocument, options);
        }
// @ts-ignore
export function useGetWritableMediaMountsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>): Apollo.UseSuspenseQueryResult<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>;
export function useGetWritableMediaMountsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>): Apollo.UseSuspenseQueryResult<GetWritableMediaMountsQuery | undefined, GetWritableMediaMountsQueryVariables>;
export function useGetWritableMediaMountsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>(GetWritableMediaMountsDocument, options);
        }
export type GetWritableMediaMountsQueryHookResult = ReturnType<typeof useGetWritableMediaMountsQuery>;
export type GetWritableMediaMountsLazyQueryHookResult = ReturnType<typeof useGetWritableMediaMountsLazyQuery>;
export type GetWritableMediaMountsSuspenseQueryHookResult = ReturnType<typeof useGetWritableMediaMountsSuspenseQuery>;
export type GetWritableMediaMountsQueryResult = Apollo.QueryResult<GetWritableMediaMountsQuery, GetWritableMediaMountsQueryVariables>;
export const GetLibraryMoviesDocument = gql`
    query getLibraryMovies {
  movies: getMovies {
    id
    tmdbId
    title
    originalTitle
    state
    posterPath
    overview
    runtime
    voteAverage
    releaseDate
    createdAt
    updatedAt
  }
}
    `;
export function useGetLibraryMoviesQuery(baseOptions?: Apollo.QueryHookOptions<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>(GetLibraryMoviesDocument, options);
      }
export function useGetLibraryMoviesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>(GetLibraryMoviesDocument, options);
        }
// @ts-ignore
export function useGetLibraryMoviesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>): Apollo.UseSuspenseQueryResult<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>;
export function useGetLibraryMoviesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>): Apollo.UseSuspenseQueryResult<GetLibraryMoviesQuery | undefined, GetLibraryMoviesQueryVariables>;
export function useGetLibraryMoviesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>(GetLibraryMoviesDocument, options);
        }
export type GetLibraryMoviesQueryHookResult = ReturnType<typeof useGetLibraryMoviesQuery>;
export type GetLibraryMoviesLazyQueryHookResult = ReturnType<typeof useGetLibraryMoviesLazyQuery>;
export type GetLibraryMoviesSuspenseQueryHookResult = ReturnType<typeof useGetLibraryMoviesSuspenseQuery>;
export type GetLibraryMoviesQueryResult = Apollo.QueryResult<GetLibraryMoviesQuery, GetLibraryMoviesQueryVariables>;
export const GetLibraryTvShowsDocument = gql`
    query getLibraryTVShows {
  tvShows: getTVShows {
    id
    tmdbId
    title
    originalTitle
    posterPath
    runtime
    overview
    voteAverage
    releaseDate
    createdAt
    updatedAt
  }
}
    `;
export function useGetLibraryTvShowsQuery(baseOptions?: Apollo.QueryHookOptions<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>(GetLibraryTvShowsDocument, options);
      }
export function useGetLibraryTvShowsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>(GetLibraryTvShowsDocument, options);
        }
// @ts-ignore
export function useGetLibraryTvShowsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>;
export function useGetLibraryTvShowsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLibraryTvShowsQuery | undefined, GetLibraryTvShowsQueryVariables>;
export function useGetLibraryTvShowsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>(GetLibraryTvShowsDocument, options);
        }
export type GetLibraryTvShowsQueryHookResult = ReturnType<typeof useGetLibraryTvShowsQuery>;
export type GetLibraryTvShowsLazyQueryHookResult = ReturnType<typeof useGetLibraryTvShowsLazyQuery>;
export type GetLibraryTvShowsSuspenseQueryHookResult = ReturnType<typeof useGetLibraryTvShowsSuspenseQuery>;
export type GetLibraryTvShowsQueryResult = Apollo.QueryResult<GetLibraryTvShowsQuery, GetLibraryTvShowsQueryVariables>;
export const GetMissingDocument = gql`
    query getMissing {
  tvEpisodes: getMissingTVEpisodes {
    ...MissingTVEpisodes
  }
  movies: getMissingMovies {
    ...MissingMovies
  }
}
    ${MissingTvEpisodesFragmentDoc}
${MissingMoviesFragmentDoc}`;
export function useGetMissingQuery(baseOptions?: Apollo.QueryHookOptions<GetMissingQuery, GetMissingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMissingQuery, GetMissingQueryVariables>(GetMissingDocument, options);
      }
export function useGetMissingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMissingQuery, GetMissingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMissingQuery, GetMissingQueryVariables>(GetMissingDocument, options);
        }
// @ts-ignore
export function useGetMissingSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMissingQuery, GetMissingQueryVariables>): Apollo.UseSuspenseQueryResult<GetMissingQuery, GetMissingQueryVariables>;
export function useGetMissingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMissingQuery, GetMissingQueryVariables>): Apollo.UseSuspenseQueryResult<GetMissingQuery | undefined, GetMissingQueryVariables>;
export function useGetMissingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMissingQuery, GetMissingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMissingQuery, GetMissingQueryVariables>(GetMissingDocument, options);
        }
export type GetMissingQueryHookResult = ReturnType<typeof useGetMissingQuery>;
export type GetMissingLazyQueryHookResult = ReturnType<typeof useGetMissingLazyQuery>;
export type GetMissingSuspenseQueryHookResult = ReturnType<typeof useGetMissingSuspenseQuery>;
export type GetMissingQueryResult = Apollo.QueryResult<GetMissingQuery, GetMissingQueryVariables>;
export const GetMovieFileDetailsDocument = gql`
    query getMovieFileDetails($tmdbId: Int!) {
  details: getMovieFileDetails(tmdbId: $tmdbId) {
    id
    libraryPath
    libraryFileSize
    torrentFileName
  }
}
    `;
export function useGetMovieFileDetailsQuery(baseOptions: Apollo.QueryHookOptions<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables> & ({ variables: GetMovieFileDetailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>(GetMovieFileDetailsDocument, options);
      }
export function useGetMovieFileDetailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>(GetMovieFileDetailsDocument, options);
        }
// @ts-ignore
export function useGetMovieFileDetailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>;
export function useGetMovieFileDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetMovieFileDetailsQuery | undefined, GetMovieFileDetailsQueryVariables>;
export function useGetMovieFileDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>(GetMovieFileDetailsDocument, options);
        }
export type GetMovieFileDetailsQueryHookResult = ReturnType<typeof useGetMovieFileDetailsQuery>;
export type GetMovieFileDetailsLazyQueryHookResult = ReturnType<typeof useGetMovieFileDetailsLazyQuery>;
export type GetMovieFileDetailsSuspenseQueryHookResult = ReturnType<typeof useGetMovieFileDetailsSuspenseQuery>;
export type GetMovieFileDetailsQueryResult = Apollo.QueryResult<GetMovieFileDetailsQuery, GetMovieFileDetailsQueryVariables>;
export const GetParamsDocument = gql`
    query getParams {
  params: getParams {
    region
    language
    tmdb_api_key
    jackett_api_key
    max_movie_download_size
    max_tvshow_episode_download_size
    organize_library_strategy
  }
}
    `;
export function useGetParamsQuery(baseOptions?: Apollo.QueryHookOptions<GetParamsQuery, GetParamsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetParamsQuery, GetParamsQueryVariables>(GetParamsDocument, options);
      }
export function useGetParamsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetParamsQuery, GetParamsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetParamsQuery, GetParamsQueryVariables>(GetParamsDocument, options);
        }
// @ts-ignore
export function useGetParamsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetParamsQuery, GetParamsQueryVariables>): Apollo.UseSuspenseQueryResult<GetParamsQuery, GetParamsQueryVariables>;
export function useGetParamsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetParamsQuery, GetParamsQueryVariables>): Apollo.UseSuspenseQueryResult<GetParamsQuery | undefined, GetParamsQueryVariables>;
export function useGetParamsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetParamsQuery, GetParamsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetParamsQuery, GetParamsQueryVariables>(GetParamsDocument, options);
        }
export type GetParamsQueryHookResult = ReturnType<typeof useGetParamsQuery>;
export type GetParamsLazyQueryHookResult = ReturnType<typeof useGetParamsLazyQuery>;
export type GetParamsSuspenseQueryHookResult = ReturnType<typeof useGetParamsSuspenseQuery>;
export type GetParamsQueryResult = Apollo.QueryResult<GetParamsQuery, GetParamsQueryVariables>;
export const GetPopularDocument = gql`
    query getPopular {
  results: getPopular {
    movies {
      id
      tmdbId
      title
      releaseDate
      posterPath
      overview
      runtime
      voteAverage
    }
    tvShows {
      id
      tmdbId
      title
      releaseDate
      posterPath
      overview
      runtime
      voteAverage
    }
  }
}
    `;
export function useGetPopularQuery(baseOptions?: Apollo.QueryHookOptions<GetPopularQuery, GetPopularQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPopularQuery, GetPopularQueryVariables>(GetPopularDocument, options);
      }
export function useGetPopularLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPopularQuery, GetPopularQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPopularQuery, GetPopularQueryVariables>(GetPopularDocument, options);
        }
// @ts-ignore
export function useGetPopularSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPopularQuery, GetPopularQueryVariables>): Apollo.UseSuspenseQueryResult<GetPopularQuery, GetPopularQueryVariables>;
export function useGetPopularSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPopularQuery, GetPopularQueryVariables>): Apollo.UseSuspenseQueryResult<GetPopularQuery | undefined, GetPopularQueryVariables>;
export function useGetPopularSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPopularQuery, GetPopularQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPopularQuery, GetPopularQueryVariables>(GetPopularDocument, options);
        }
export type GetPopularQueryHookResult = ReturnType<typeof useGetPopularQuery>;
export type GetPopularLazyQueryHookResult = ReturnType<typeof useGetPopularLazyQuery>;
export type GetPopularSuspenseQueryHookResult = ReturnType<typeof useGetPopularSuspenseQuery>;
export type GetPopularQueryResult = Apollo.QueryResult<GetPopularQuery, GetPopularQueryVariables>;
export const GetQualityDocument = gql`
    query getQuality($type: Entertainment!) {
  qualities: getQualityParams(type: $type) {
    id
    name
    match
    score
    updatedAt
    createdAt
    type
  }
}
    `;
export function useGetQualityQuery(baseOptions: Apollo.QueryHookOptions<GetQualityQuery, GetQualityQueryVariables> & ({ variables: GetQualityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetQualityQuery, GetQualityQueryVariables>(GetQualityDocument, options);
      }
export function useGetQualityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetQualityQuery, GetQualityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetQualityQuery, GetQualityQueryVariables>(GetQualityDocument, options);
        }
// @ts-ignore
export function useGetQualitySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetQualityQuery, GetQualityQueryVariables>): Apollo.UseSuspenseQueryResult<GetQualityQuery, GetQualityQueryVariables>;
export function useGetQualitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetQualityQuery, GetQualityQueryVariables>): Apollo.UseSuspenseQueryResult<GetQualityQuery | undefined, GetQualityQueryVariables>;
export function useGetQualitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetQualityQuery, GetQualityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetQualityQuery, GetQualityQueryVariables>(GetQualityDocument, options);
        }
export type GetQualityQueryHookResult = ReturnType<typeof useGetQualityQuery>;
export type GetQualityLazyQueryHookResult = ReturnType<typeof useGetQualityLazyQuery>;
export type GetQualitySuspenseQueryHookResult = ReturnType<typeof useGetQualitySuspenseQuery>;
export type GetQualityQueryResult = Apollo.QueryResult<GetQualityQuery, GetQualityQueryVariables>;
export const GetRecommendedDocument = gql`
    query getRecommended {
  tvShows: getRecommendedTVShows {
    id
    tmdbId
    title
    releaseDate
    posterPath
    overview
    runtime
    voteAverage
  }
  movies: getRecommendedMovies {
    id
    tmdbId
    title
    releaseDate
    posterPath
    overview
    runtime
    voteAverage
  }
}
    `;
export function useGetRecommendedQuery(baseOptions?: Apollo.QueryHookOptions<GetRecommendedQuery, GetRecommendedQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRecommendedQuery, GetRecommendedQueryVariables>(GetRecommendedDocument, options);
      }
export function useGetRecommendedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRecommendedQuery, GetRecommendedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRecommendedQuery, GetRecommendedQueryVariables>(GetRecommendedDocument, options);
        }
// @ts-ignore
export function useGetRecommendedSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRecommendedQuery, GetRecommendedQueryVariables>): Apollo.UseSuspenseQueryResult<GetRecommendedQuery, GetRecommendedQueryVariables>;
export function useGetRecommendedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRecommendedQuery, GetRecommendedQueryVariables>): Apollo.UseSuspenseQueryResult<GetRecommendedQuery | undefined, GetRecommendedQueryVariables>;
export function useGetRecommendedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRecommendedQuery, GetRecommendedQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRecommendedQuery, GetRecommendedQueryVariables>(GetRecommendedDocument, options);
        }
export type GetRecommendedQueryHookResult = ReturnType<typeof useGetRecommendedQuery>;
export type GetRecommendedLazyQueryHookResult = ReturnType<typeof useGetRecommendedLazyQuery>;
export type GetRecommendedSuspenseQueryHookResult = ReturnType<typeof useGetRecommendedSuspenseQuery>;
export type GetRecommendedQueryResult = Apollo.QueryResult<GetRecommendedQuery, GetRecommendedQueryVariables>;
export const GetTagsDocument = gql`
    query getTags {
  tags: getTags {
    id
    name
    score
    createdAt
    updatedAt
  }
}
    `;
export function useGetTagsQuery(baseOptions?: Apollo.QueryHookOptions<GetTagsQuery, GetTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTagsQuery, GetTagsQueryVariables>(GetTagsDocument, options);
      }
export function useGetTagsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTagsQuery, GetTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTagsQuery, GetTagsQueryVariables>(GetTagsDocument, options);
        }
// @ts-ignore
export function useGetTagsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTagsQuery, GetTagsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTagsQuery, GetTagsQueryVariables>;
export function useGetTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTagsQuery, GetTagsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTagsQuery | undefined, GetTagsQueryVariables>;
export function useGetTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTagsQuery, GetTagsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTagsQuery, GetTagsQueryVariables>(GetTagsDocument, options);
        }
export type GetTagsQueryHookResult = ReturnType<typeof useGetTagsQuery>;
export type GetTagsLazyQueryHookResult = ReturnType<typeof useGetTagsLazyQuery>;
export type GetTagsSuspenseQueryHookResult = ReturnType<typeof useGetTagsSuspenseQuery>;
export type GetTagsQueryResult = Apollo.QueryResult<GetTagsQuery, GetTagsQueryVariables>;
export const GetTorrentStatusDocument = gql`
    query getTorrentStatus($torrents: [GetTorrentStatusInput!]!) {
  torrents: getTorrentStatus(torrents: $torrents) {
    id
    resourceId
    resourceType
    percentDone
    rateDownload
    rateUpload
    uploadRatio
    uploadedEver
    totalSize
    status
  }
}
    `;
export function useGetTorrentStatusQuery(baseOptions: Apollo.QueryHookOptions<GetTorrentStatusQuery, GetTorrentStatusQueryVariables> & ({ variables: GetTorrentStatusQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>(GetTorrentStatusDocument, options);
      }
export function useGetTorrentStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>(GetTorrentStatusDocument, options);
        }
// @ts-ignore
export function useGetTorrentStatusSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>): Apollo.UseSuspenseQueryResult<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>;
export function useGetTorrentStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>): Apollo.UseSuspenseQueryResult<GetTorrentStatusQuery | undefined, GetTorrentStatusQueryVariables>;
export function useGetTorrentStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>(GetTorrentStatusDocument, options);
        }
export type GetTorrentStatusQueryHookResult = ReturnType<typeof useGetTorrentStatusQuery>;
export type GetTorrentStatusLazyQueryHookResult = ReturnType<typeof useGetTorrentStatusLazyQuery>;
export type GetTorrentStatusSuspenseQueryHookResult = ReturnType<typeof useGetTorrentStatusSuspenseQuery>;
export type GetTorrentStatusQueryResult = Apollo.QueryResult<GetTorrentStatusQuery, GetTorrentStatusQueryVariables>;
export const GetTvSeasonDetailsDocument = gql`
    query getTVSeasonDetails($tvShowTMDBId: Int!, $seasonNumber: Int!) {
  episodes: getTVSeasonDetails(
    tvShowTMDBId: $tvShowTMDBId
    seasonNumber: $seasonNumber
  ) {
    id
    episodeNumber
    seasonNumber
    state
    updatedAt
    voteAverage
    releaseDate
    createdAt
    tvShow {
      id
      title
      tmdbId
      updatedAt
      createdAt
    }
  }
}
    `;
export function useGetTvSeasonDetailsQuery(baseOptions: Apollo.QueryHookOptions<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables> & ({ variables: GetTvSeasonDetailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>(GetTvSeasonDetailsDocument, options);
      }
export function useGetTvSeasonDetailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>(GetTvSeasonDetailsDocument, options);
        }
// @ts-ignore
export function useGetTvSeasonDetailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>;
export function useGetTvSeasonDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTvSeasonDetailsQuery | undefined, GetTvSeasonDetailsQueryVariables>;
export function useGetTvSeasonDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>(GetTvSeasonDetailsDocument, options);
        }
export type GetTvSeasonDetailsQueryHookResult = ReturnType<typeof useGetTvSeasonDetailsQuery>;
export type GetTvSeasonDetailsLazyQueryHookResult = ReturnType<typeof useGetTvSeasonDetailsLazyQuery>;
export type GetTvSeasonDetailsSuspenseQueryHookResult = ReturnType<typeof useGetTvSeasonDetailsSuspenseQuery>;
export type GetTvSeasonDetailsQueryResult = Apollo.QueryResult<GetTvSeasonDetailsQuery, GetTvSeasonDetailsQueryVariables>;
export const GetTvShowSeasonsDocument = gql`
    query getTVShowSeasons($tvShowTMDBId: Int!) {
  seasons: getTVShowSeasons(tvShowTMDBId: $tvShowTMDBId) {
    id
    name
    seasonNumber
    episodeCount
    overview
    posterPath
    airDate
    inLibrary
  }
}
    `;
export function useGetTvShowSeasonsQuery(baseOptions: Apollo.QueryHookOptions<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables> & ({ variables: GetTvShowSeasonsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>(GetTvShowSeasonsDocument, options);
      }
export function useGetTvShowSeasonsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>(GetTvShowSeasonsDocument, options);
        }
// @ts-ignore
export function useGetTvShowSeasonsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>;
export function useGetTvShowSeasonsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTvShowSeasonsQuery | undefined, GetTvShowSeasonsQueryVariables>;
export function useGetTvShowSeasonsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>(GetTvShowSeasonsDocument, options);
        }
export type GetTvShowSeasonsQueryHookResult = ReturnType<typeof useGetTvShowSeasonsQuery>;
export type GetTvShowSeasonsLazyQueryHookResult = ReturnType<typeof useGetTvShowSeasonsLazyQuery>;
export type GetTvShowSeasonsSuspenseQueryHookResult = ReturnType<typeof useGetTvShowSeasonsSuspenseQuery>;
export type GetTvShowSeasonsQueryResult = Apollo.QueryResult<GetTvShowSeasonsQuery, GetTvShowSeasonsQueryVariables>;
export const OmdbSearchDocument = gql`
    query omdbSearch($title: String!) {
  result: omdbSearch(title: $title) {
    ratings {
      IMDB
      rottenTomatoes
      metaCritic
    }
  }
}
    `;
export function useOmdbSearchQuery(baseOptions: Apollo.QueryHookOptions<OmdbSearchQuery, OmdbSearchQueryVariables> & ({ variables: OmdbSearchQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OmdbSearchQuery, OmdbSearchQueryVariables>(OmdbSearchDocument, options);
      }
export function useOmdbSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OmdbSearchQuery, OmdbSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OmdbSearchQuery, OmdbSearchQueryVariables>(OmdbSearchDocument, options);
        }
// @ts-ignore
export function useOmdbSearchSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<OmdbSearchQuery, OmdbSearchQueryVariables>): Apollo.UseSuspenseQueryResult<OmdbSearchQuery, OmdbSearchQueryVariables>;
export function useOmdbSearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OmdbSearchQuery, OmdbSearchQueryVariables>): Apollo.UseSuspenseQueryResult<OmdbSearchQuery | undefined, OmdbSearchQueryVariables>;
export function useOmdbSearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OmdbSearchQuery, OmdbSearchQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OmdbSearchQuery, OmdbSearchQueryVariables>(OmdbSearchDocument, options);
        }
export type OmdbSearchQueryHookResult = ReturnType<typeof useOmdbSearchQuery>;
export type OmdbSearchLazyQueryHookResult = ReturnType<typeof useOmdbSearchLazyQuery>;
export type OmdbSearchSuspenseQueryHookResult = ReturnType<typeof useOmdbSearchSuspenseQuery>;
export type OmdbSearchQueryResult = Apollo.QueryResult<OmdbSearchQuery, OmdbSearchQueryVariables>;
export const SearchTorrentDocument = gql`
    query searchTorrent($query: String!, $quality: String) {
  results: searchJackett(query: $query, quality: $quality) {
    id
    title
    quality
    qualityScore
    seeders
    peers
    link
    downloadLink
    tag
    tagScore
    normalizedTitle
    normalizedTitleParts
    size
    publishDate
  }
}
    `;
export function useSearchTorrentQuery(baseOptions: Apollo.QueryHookOptions<SearchTorrentQuery, SearchTorrentQueryVariables> & ({ variables: SearchTorrentQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchTorrentQuery, SearchTorrentQueryVariables>(SearchTorrentDocument, options);
      }
export function useSearchTorrentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchTorrentQuery, SearchTorrentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchTorrentQuery, SearchTorrentQueryVariables>(SearchTorrentDocument, options);
        }
// @ts-ignore
export function useSearchTorrentSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchTorrentQuery, SearchTorrentQueryVariables>): Apollo.UseSuspenseQueryResult<SearchTorrentQuery, SearchTorrentQueryVariables>;
export function useSearchTorrentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchTorrentQuery, SearchTorrentQueryVariables>): Apollo.UseSuspenseQueryResult<SearchTorrentQuery | undefined, SearchTorrentQueryVariables>;
export function useSearchTorrentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchTorrentQuery, SearchTorrentQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchTorrentQuery, SearchTorrentQueryVariables>(SearchTorrentDocument, options);
        }
export type SearchTorrentQueryHookResult = ReturnType<typeof useSearchTorrentQuery>;
export type SearchTorrentLazyQueryHookResult = ReturnType<typeof useSearchTorrentLazyQuery>;
export type SearchTorrentSuspenseQueryHookResult = ReturnType<typeof useSearchTorrentSuspenseQuery>;
export type SearchTorrentQueryResult = Apollo.QueryResult<SearchTorrentQuery, SearchTorrentQueryVariables>;
export const SearchDocument = gql`
    query search($query: String!) {
  results: search(query: $query) {
    movies {
      id
      tmdbId
      title
      releaseDate
      posterPath
      overview
      runtime
      voteAverage
    }
    tvShows {
      id
      tmdbId
      title
      releaseDate
      posterPath
      overview
      runtime
      voteAverage
    }
  }
}
    `;
export function useSearchQuery(baseOptions: Apollo.QueryHookOptions<SearchQuery, SearchQueryVariables> & ({ variables: SearchQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchQuery, SearchQueryVariables>(SearchDocument, options);
      }
export function useSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchQuery, SearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchQuery, SearchQueryVariables>(SearchDocument, options);
        }
// @ts-ignore
export function useSearchSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchQuery, SearchQueryVariables>): Apollo.UseSuspenseQueryResult<SearchQuery, SearchQueryVariables>;
export function useSearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchQuery, SearchQueryVariables>): Apollo.UseSuspenseQueryResult<SearchQuery | undefined, SearchQueryVariables>;
export function useSearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchQuery, SearchQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchQuery, SearchQueryVariables>(SearchDocument, options);
        }
export type SearchQueryHookResult = ReturnType<typeof useSearchQuery>;
export type SearchLazyQueryHookResult = ReturnType<typeof useSearchLazyQuery>;
export type SearchSuspenseQueryHookResult = ReturnType<typeof useSearchSuspenseQuery>;
export type SearchQueryResult = Apollo.QueryResult<SearchQuery, SearchQueryVariables>;
