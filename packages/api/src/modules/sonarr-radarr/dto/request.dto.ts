import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AddOptionsDTO {
  @Field(() => Boolean, { nullable: true })
  public searchForMovie!: boolean;

  @Field(() => Boolean, { nullable: true })
  public searchForMissingEpisodes!: boolean;

  @Field(() => Int, { nullable: true })
  public monitored!: number;
}

@ObjectType()
export class AddMovieRequest {
  @Field(() => String)
  public tmdbId!: string;

  @Field(() => String, { nullable: true })
  public title!: string;

  @Field(() => String, { nullable: true })
  public year!: string;

  @Field(() => AddOptionsDTO, { nullable: true })
  public addOptions!: AddOptionsDTO;
}

@ObjectType()
export class SeasonRequest {
  @Field(() => Int)
  public seasonNumber!: number;

  @Field(() => Boolean, { nullable: true })
  public monitored!: boolean;
}

@ObjectType()
export class AddSeriesRequest {
  @Field(() => String)
  public tmdbId!: string;

  @Field(() => String, { nullable: true })
  public title!: string;

  @Field(() => String, { nullable: true })
  public year!: string;

  @Field(() => AddOptionsDTO, { nullable: true })
  public addOptions!: AddOptionsDTO;

  @Field(() => [SeasonRequest], { nullable: true })
  public seasons?: SeasonRequest[];
}

@ObjectType()
export class SeriesSearchRequest {
  @Field(() => Int)
  public seasonNumber!: number;

  @Field(() => Boolean, { nullable: true })
  public searchForMissingEpisodes!: boolean;
}

@ObjectType()
export class MovieSearchRequest {
  @Field(() => Boolean)
  public searchForMovie!: boolean;
}
