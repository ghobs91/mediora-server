import { Field, ObjectType } from '@nestjs/graphql';

import { BaseDTO } from './shared.dto';

@ObjectType()
export class RadarrMovieQualityProfile extends BaseDTO {
  @Field(() => String)
  public name!: string;
}

@ObjectType()
export class RadarrMovieRootFolder extends BaseDTO {
  @Field(() => String)
  public path!: string;

  @Field(() => Number)
  public freeSpace!: number;
}

@ObjectType()
export class RadarrMovieGenre {
  @Field(() => Number)
  public id!: number;

  @Field(() => String)
  public name!: string;
}

@ObjectType()
export class RadarrMovie extends BaseDTO {
  @Field(() => String)
  public tmdbId!: string;

  @Field(() => String)
  public imdbId!: string;

  @Field(() => String)
  public title!: string;

  @Field(() => String)
  public originalTitle!: string | null;

  @Field(() => String, { nullable: true })
  public originalFileNamePrefix!: string;

  @Field(() => String)
  public summary!: string;

  @Field(() => String)
  public year!: string;

  @Field(() => String)
  public path!: string;

  @Field(() => String)
  public runtime!: string;

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

  @Field(() => [RadarrMovieGenre])
  public genres!: RadarrMovieGenre[];

  @Field(() => [RadarrMovieRootFolder])
  public rootFolders!: RadarrMovieRootFolder[];

  @Field(() => [RadarrMovieQualityProfile])
  public qualityProfiles!: RadarrMovieQualityProfile[];

  @Field(() => Boolean)
  public hasPreRollingJob!: boolean;
}

@ObjectType()
export class RadarrQueueItem extends BaseDTO {
  @Field(() => String)
  public movieId!: string;

  @Field(() => String)
  public movieTmdbId!: string;

  @Field(() => String)
  public title!: string;

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
}
