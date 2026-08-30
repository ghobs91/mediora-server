import { Field, ObjectType } from '@nestjs/graphql';

import { BaseDTO } from './shared.dto';

@ObjectType()
export class SonarrEpisodeGenre extends BaseDTO {
  @Field(() => String)
  public name!: string;
}

@ObjectType()
export class SonarrEpisodeFile extends BaseDTO {
  @Field(() => String)
  public path!: string;

  @Field(() => Number)
  public size!: number;

  @Field(() => Number, { nullable: true })
  public sizeLeft!: number;

  @Field(() => Number, { nullable: true })
  public lastModified!: number;

  @Field(() => [SonarrEpisodeGenre])
  public genres!: SonarrEpisodeGenre[];
}

@ObjectType()
export class SonarrEpisode extends BaseDTO {
  @Field(() => Number)
  public episodeNumber!: number;

  @Field(() => Number)
  public seasonNumber!: number;

  @Field(() => String, { nullable: true })
  public title!: string;

  @Field(() => String, { nullable: true })
  public airDate!: string | null;

  @Field(() => String)
  public seriesId!: string;

  @Field(() => Boolean)
  public hasFile!: boolean;

  @Field(() => Boolean)
  public isAvailable!: boolean;

  @Field(() => Boolean)
  public isMonitored!: boolean;

  @Field(() => [SonarrEpisodeFile])
  public files!: SonarrEpisodeFile[];

  @Field(() => [SonarrEpisodeGenre])
  public genres!: SonarrEpisodeGenre[];
}

@ObjectType()
export class SonarrSeason extends BaseDTO {
  @Field(() => Number)
  public seasonNumber!: number;

  @Field(() => Boolean)
  public isMonitored!: boolean;

  @Field(() => Boolean)
  public hasAllEpisodes!: boolean;

  @Field(() => [SonarrEpisode])
  public episodes!: SonarrEpisode[];
}

@ObjectType()
export class SonarrSeriesGenre {
  @Field(() => Number)
  public id!: number;

  @Field(() => String)
  public name!: string;
}

@ObjectType()
export class SonarrSeries extends BaseDTO {
  @Field(() => String)
  public tvdbId!: string;

  @Field(() => String, { nullable: true })
  public imdbId!: string | null;

  @Field(() => String)
  public title!: string;

  @Field(() => String, { nullable: true })
  public originalTitle!: string | null;

  @Field(() => String)
  public summary!: string;

  @Field(() => String, { nullable: true })
  public network!: string | null;

  @Field(() => String)
  public year!: string;

  @Field(() => String)
  public path!: string;

  @Field(() => String, { nullable: true })
  public runtime!: string | null;

  @Field(() => String)
  public releaseDate!: string;

  @Field(() => String, { nullable: true })
  public posterPath!: string | null;

  @Field(() => String, { nullable: true })
  public coverType!: string;

  @Field(() => String, { nullable: true })
  public coverUrl!: string | null;

  @Field(() => String)
  public monogram!: string;

  @Field(() => Number)
  public rating!: number;

  @Field(() => Boolean)
  public hasFile!: boolean;

  @Field(() => Boolean)
  public isAvailable!: boolean;

  @Field(() => Boolean)
  public isMovieAvailable!: boolean;

  @Field(() => [SonarrSeriesGenre])
  public genres!: SonarrSeriesGenre[];

  @Field(() => [SonarrSeason])
  public seasons!: SonarrSeason[];
}

@ObjectType()
export class SonarrEpisodeFileDTO extends BaseDTO {
  @Field(() => Number)
  public size!: number;
}

@ObjectType()
export class SonarrQueueItem extends BaseDTO {
  @Field(() => String)
  public seriesId!: string;

  @Field(() => String)
  public seriesTmdbId!: string;

  @Field(() => String, { nullable: true })
  public episodeId!: string;

  @Field(() => String)
  public seriesTitle!: string;

  @Field(() => String, { nullable: true })
  public episodeTitle!: string;

  @Field(() => Number)
  public seasonNumber!: number;

  @Field(() => Number)
  public episodeNumber!: number;

  @Field(() => String)
  public size!: string;

  @Field(() => String)
  public sizeleft!: string;

  @Field(() => String)
  public status!: string;

  @Field(() => String)
  public statusMessages!: string;

  @Field(() => String)
  public downloadId!: string;

  @Field(() => Boolean)
  public queued!: boolean;

  @Field(() => Number)
  public percentDone!: number;

  @Field(() => Number)
  public timeleft!: number;

  @Field(() => Number)
  public projectedCompletion!: number;

  @Field(() => String)
  public trackedDownloadStatus!: string;

  @Field(() => String)
  public trackedDownloadState!: string;

  @Field(() => Boolean)
  public isAvailable!: boolean;

  @Field(() => Boolean)
  public isFullAvailable!: boolean;

  @Field(() => Boolean)
  public fullAvailable!: boolean;

  @Field(() => Boolean)
  public sizeleftKnown!: boolean;

  @Field(() => Boolean)
  public completed!: boolean;

  @Field(() => SonarrEpisodeFileDTO, { nullable: true })
  public episodeFile?: SonarrEpisodeFileDTO;
}
