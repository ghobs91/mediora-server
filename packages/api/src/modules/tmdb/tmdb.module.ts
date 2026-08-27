import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from 'src/modules/redis/redis.module';
import { ParamsModule } from 'src/modules/params/params.module';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVShow } from 'src/entities/tvshow.entity';
import { Movie } from 'src/entities/movie.entity';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';
import { MovieDAO } from 'src/entities/dao/movie.dao';

import { TMDBResolver } from './tmdb.resolver';
import { TMDBService } from './tmdb.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TVSeason, TVShow, Movie]),
    ParamsModule,
    RedisModule,
  ],
  providers: [TMDBResolver, TMDBService, TVSeasonDAO, TVShowDAO, MovieDAO],
  exports: [TMDBService],
})
export class TMDBModule {}
