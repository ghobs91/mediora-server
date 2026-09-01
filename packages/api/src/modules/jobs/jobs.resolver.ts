import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { GraphQLCommonResponse } from 'src/app.dto';

import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';

import { JobsService } from './jobs.service';

@Resolver()
export class JobsResolver {
  public constructor(
    private readonly jobsService: JobsService,
    private readonly tvSeasonDAO: TVSeasonDAO,
  ) {}

  @Mutation((_returns) => GraphQLCommonResponse)
  public async startScanLibraryJob() {
    await this.jobsService.startScanLibrary();
    return { success: true, message: 'SCAN_LIBRARY_FOLDER_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async startFindNewEpisodesJob() {
    await this.jobsService.startFindNewEpisodes();
    return { success: true, message: 'FIND_NEW_EPISODES_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async startDownloadMissingJob() {
    await this.jobsService.startDownloadMissing();
    return { success: true, message: 'DOWNLOAD_MISSING_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadMovieWithQuality(
    @Args('movieId', { type: () => Int }) movieId: number,
    @Args('quality', { type: () => String, nullable: true }) quality?: string,
  ) {
    await this.jobsService.startDownloadMovie(movieId, quality);
    return { success: true, message: 'MOVIE_DOWNLOAD_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadEpisodeWithQuality(
    @Args('episodeId', { type: () => Int }) episodeId: number,
    @Args('quality', { type: () => String, nullable: true }) quality?: string,
  ) {
    await this.jobsService.startDownloadEpisode(episodeId, quality);
    return { success: true, message: 'TV_EPISODE_DOWNLOAD_STARTED' };
  }

  @Mutation((_returns) => GraphQLCommonResponse)
  public async downloadSeasonWithQuality(
    @Args('tvShowTMDBId', { type: () => Int }) tvShowTMDBId: number,
    @Args('seasonNumber', { type: () => Int }) seasonNumber: number,
    @Args('quality', { type: () => String, nullable: true }) quality?: string,
  ) {
    const season = await this.tvSeasonDAO.findOneByTmdbAndSeason(
      tvShowTMDBId,
      seasonNumber,
    );

    if (season === null || season === undefined) {
      return {
        success: false,
        message: 'SEASON_NOT_FOUND_IN_LIBRARY',
      };
    }

    await this.jobsService.startDownloadSeason(season.id, quality);
    return { success: true, message: 'TV_SEASON_DOWNLOAD_STARTED' };
  }
}
