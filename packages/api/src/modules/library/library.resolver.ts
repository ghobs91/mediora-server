import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseInterceptors } from '@nestjs/common';

import { GraphQLCommonResponse, FileType } from 'src/app.dto';

import { makeInvalidateCacheInterceptor } from 'src/modules/redis/invalidate-cache.interceptor';
import { CacheKeys } from 'src/modules/redis/cache.dto';

import { Movie } from 'src/entities/movie.entity';
import { TVShow } from 'src/entities/tvshow.entity';

import { LibraryQueryService } from './library-query.service';
import { LibraryDownloadService } from './library-download.service';
import { LibraryOrganizationService } from './library-organization.service';
import { LibraryFoldersService } from './library-folders.service';
import { LibraryFoldersStatus } from './library-folders.dto';

import {
  EnrichedMovie,
  EnrichedTVShow,
  DownloadingMedia,
  EnrichedTVEpisode,
  JackettInput,
  SearchingMedia,
  LibraryCalendar,
  LibraryFileDetails,
} from './library.dto';

import { makeCacheInterceptor } from '../redis/cache.interceptor';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';

@Resolver()
export class LibraryResolver {
  public constructor(
    private readonly libraryQueryService: LibraryQueryService,
    private readonly libraryDownloadService: LibraryDownloadService,
    private readonly libraryOrganizationService: LibraryOrganizationService,
    private readonly libraryFoldersService: LibraryFoldersService,
    private readonly tvShowDAO: TVShowDAO
  ) {}

  @Query((_returns) => [DownloadingMedia])
  public getDownloadingMedias() {
    return this.libraryQueryService.getDownloading();
  }

  @Query((_returns) => [SearchingMedia])
  public getSearchingMedias() {
    return this.libraryQueryService.getSearching();
  }

  @Query((_returns) => [EnrichedMovie])
  public getMovies() {
    return this.libraryQueryService.getMovies();
  }

  @Query((_returns) => [EnrichedTVShow])
  public getTVShows() {
    return this.libraryQueryService.getTVShows();
  }

  @Query((_returns) => [EnrichedTVEpisode])
  public getMissingTVEpisodes() {
    return this.libraryQueryService.findMissingTVEpisodes();
  }

  @Query((_returns) => [EnrichedMovie])
  public getMissingMovies() {
    return this.libraryQueryService.findMissingMovies();
  }

  @Query((_returns) => [EnrichedTVEpisode])
  public getTVSeasonDetails(
    @Args('tvShowTMDBId', { type: () => Int }) tvShowTMDBId: number,
    @Args('seasonNumber', { type: () => Int }) seasonNumber: number
  ) {
    return this.libraryQueryService.getTVSeasonDetails({
      tvShowTMDBId,
      seasonNumber,
    });
  }

  @UseInterceptors(
    makeCacheInterceptor({
      key: CacheKeys.CALENDAR,
      ttl: 1000 * 60 * 60 * 24, // one day
    })
  )
  @Query((_returns) => LibraryCalendar)
  public getCalendar() {
    return this.libraryQueryService.calendar();
  }

  @Query((_returns) => LibraryFileDetails)
  public getMovieFileDetails(
    @Args('tmdbId', { type: () => Int }) tmdbId: number
  ) {
    return this.libraryQueryService.getMovieFileDetails(tmdbId);
  }

  @Query((_returns) => LibraryFoldersStatus)
  public getLibraryFolders() {
    return this.libraryFoldersService.inspect();
  }

  @Mutation((_returns) => LibraryFoldersStatus)
  public updateLibraryFolders(
    @Args('moviesFolderName') moviesFolderName: string,
    @Args('tvShowsFolderName') tvShowsFolderName: string
  ) {
    return this.libraryFoldersService.updateFolderNames({
      movies: moviesFolderName,
      tvshows: tvShowsFolderName,
    });
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadMovie(
    @Args('movieId', { type: () => Int }) movieId: number,
    @Args('jackettResult', { type: () => JackettInput })
    jackettResult: JackettInput
  ) {
    await this.libraryDownloadService.downloadMovie(movieId, jackettResult, null);
    return { success: true, message: 'MOVIE_DOWNLOAD_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadSeason(
    @Args('tvShowTMDBId', { type: () => Int }) tvShowTMDBId: number,
    @Args('seasonNumber', { type: () => Int }) seasonNumber: number,
    @Args('jackettResult', { type: () => JackettInput })
    jackettResult: JackettInput
  ) {
    const { seasons } = await this.tvShowDAO
      .createQueryBuilder('tvShow')
      .innerJoinAndSelect(
        'tvShow.seasons',
        'season',
        'season.seasonNumber = :seasonNumber',
        { seasonNumber }
      )
      .where('tvShow.tmdbId = :tvShowTMDBId', { tvShowTMDBId })
      .getOneOrFail();

    const [{ id: seasonId }] = seasons;
    await this.libraryDownloadService.downloadTVSeason(seasonId, jackettResult, null);

    return { success: true, message: 'TV_EPISODE_DOWNLOAD_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadTVEpisode(
    @Args('episodeId', { type: () => Int }) episodeId: number,
    @Args('jackettResult', { type: () => JackettInput })
    jackettResult: JackettInput
  ) {
    await this.libraryDownloadService.downloadTVEpisode(episodeId, jackettResult, null);
    return { success: true, message: 'TV_EPISODE_DOWNLOAD_STARTED' };
  }

  @UseInterceptors(
    makeInvalidateCacheInterceptor([CacheKeys.RECOMMENDED_MOVIES])
  )
  @Mutation((_returns) => Movie, { name: 'trackMovie' })
  public trackMovie(
    @Args('title') title: string,
    @Args('tmdbId', { type: () => Int }) tmdbId: number
  ) {
    return this.libraryOrganizationService.trackMovie({ title, tmdbId });
  }

  @UseInterceptors(
    makeInvalidateCacheInterceptor([CacheKeys.RECOMMENDED_MOVIES])
  )
  @Mutation((_returns) => GraphQLCommonResponse)
  public async removeMovie(
    @Args('tmdbId', { type: () => Int }) tmdbId: number
  ) {
    await this.libraryOrganizationService.removeMovie({ tmdbId, softDelete: false }, null);
    return { success: true, message: 'MOVIE_REMOVED_FROM_LIBRARY' };
  }

  @UseInterceptors(
    makeInvalidateCacheInterceptor([CacheKeys.RECOMMENDED_TV_SHOWS])
  )
  @Mutation((_returns) => TVShow)
  public trackTVShow(
    @Args('tmdbId', { type: () => Int }) tmdbId: number,
    @Args('seasonNumbers', { type: () => [Int] }) seasonNumbers: number[]
  ) {
    return this.libraryOrganizationService.trackTVShow({ tmdbId, seasonNumbers });
  }

  @UseInterceptors(
    makeInvalidateCacheInterceptor([CacheKeys.RECOMMENDED_TV_SHOWS])
  )
  @Mutation((_returns) => GraphQLCommonResponse)
  public async removeTVShow(
    @Args('tmdbId', { type: () => Int }) tmdbId: number
  ) {
    await this.libraryOrganizationService.removeTVShow(tmdbId);
    return { success: true, message: 'TVSHOW_REMOVED_FROM_LIBRARY' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async resetLibrary(
    @Args('deleteFiles') deleteFiles: boolean,
    @Args('resetSettings') resetSettings: boolean
  ) {
    await this.libraryOrganizationService.reset({ deleteFiles, resetSettings }, null);
    return { success: true, message: 'LIBRARY_RESET' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadOwnTorrent(
    @Args('mediaId', { type: () => Int }) mediaId: number,
    @Args('mediaType', { type: () => FileType }) mediaType: FileType,
    @Args('torrent') torrent: string
  ) {
    await this.libraryDownloadService.downloadOwnTorrent(
      { mediaId, mediaType, torrent },
      null
    );
    return { success: true, message: 'DOWNLOAD_STARTED' };
  }
}
