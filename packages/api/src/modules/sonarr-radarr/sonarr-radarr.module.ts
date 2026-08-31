import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Torrent } from 'src/entities/torrent.entity';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';
import { Movie } from 'src/entities/movie.entity';
import { TVShow } from 'src/entities/tvshow.entity';
import { File } from 'src/entities/file.entity';

import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TVShowDAO } from 'src/entities/dao/tvshow.dao';
import { FileDAO } from 'src/entities/dao/file.dao';

import { TMDBModule } from 'src/modules/tmdb/tmdb.module';
import { TransmissionModule } from 'src/modules/transmission/transmission.module';
import { LibraryModule } from 'src/modules/library/library.module';
import { JobsModule } from 'src/modules/jobs/jobs.module';

import { MediaMapper } from './mappers/media-mapper';
import { SonarrRadarrService } from './services/sonarr-radarr.service';
import { RadarrController } from './controllers/radarr.controller';
import { SonarrController } from './controllers/sonarr.controller';
import { V3Controller } from './controllers/v3.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Torrent,
      TVSeason,
      TVEpisode,
      Movie,
      TVShow,
      File,
    ]),
    TMDBModule,
    TransmissionModule,
    LibraryModule,
    JobsModule,
  ],
  controllers: [RadarrController, SonarrController, V3Controller],
  providers: [
    SonarrRadarrService,
    MediaMapper,
    TorrentDAO,
    TVSeasonDAO,
    TVEpisodeDAO,
    MovieDAO,
    TVShowDAO,
    FileDAO,
  ],
})
export class SonarrRadarrModule {}
