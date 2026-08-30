import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Torrent } from 'src/entities/torrent.entity';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';
import { Movie } from 'src/entities/movie.entity';
import { TVShow } from 'src/entities/tvshow.entity';

import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';

import { TMDBModule } from 'src/modules/tmdb/tmdb.module';
import { TransmissionModule } from 'src/modules/transmission/transmission.module';
import { LibraryModule } from 'src/modules/library/library.module';
import { JobsModule } from 'src/modules/jobs/jobs.module';

import { MediaMapper } from './mappers/media-mapper';
import { SonarrRadarrService } from './services/sonarr-radarr.service';
import { RadarrController } from './controllers/radarr.controller';
import { SonarrController } from './controllers/sonarr.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Torrent, TVSeason, TVEpisode, Movie, TVShow]),
    TMDBModule,
    TransmissionModule,
    LibraryModule,
    JobsModule,
  ],
  controllers: [RadarrController, SonarrController],
  providers: [
    SonarrRadarrService,
    MediaMapper,
    TorrentDAO,
    TVSeasonDAO,
    TVEpisodeDAO,
    MovieDAO,
    TVShowDAO,
  ],
})
export class SonarrRadarrModule {}
