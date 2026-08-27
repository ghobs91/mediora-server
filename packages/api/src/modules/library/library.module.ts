import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Movie } from 'src/entities/movie.entity';
import { TVShow } from 'src/entities/tvshow.entity';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';
import { Torrent } from 'src/entities/torrent.entity';
import { MediaView } from 'src/entities/media-view.entity';

import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { MediaViewDAO } from 'src/entities/dao/media-view.dao';

import { TMDBModule } from 'src/modules/tmdb/tmdb.module';
import { JobsModule } from 'src/modules/jobs/jobs.module';
import { TransmissionModule } from 'src/modules/transmission/transmission.module';
import { RedisModule } from 'src/modules/redis/redis.module';
import { ParamsModule } from 'src/modules/params/params.module';

import { LibraryResolver } from './library.resolver';
import { LibraryService } from './library.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movie,
      TVShow,
      TVSeason,
      TVEpisode,
      Torrent,
      MediaView,
    ]),
    TMDBModule,
    TransmissionModule,
    RedisModule,
    ParamsModule,
    forwardRef(() => JobsModule),
  ],
  providers: [
    LibraryResolver,
    LibraryService,
    MovieDAO,
    TVShowDAO,
    TVSeasonDAO,
    TVEpisodeDAO,
    TorrentDAO,
    MediaViewDAO,
  ],
  exports: [LibraryService],
})
export class LibraryModule {}
