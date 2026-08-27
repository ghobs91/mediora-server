import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { REDIS_CONFIG } from 'src/config';
import { JobsQueue } from 'src/app.dto';

import { Movie } from 'src/entities/movie.entity';
import { Torrent } from 'src/entities/torrent.entity';
import { TVSeason } from 'src/entities/tvseason.entity';
import { TVEpisode } from 'src/entities/tvepisode.entity';
import { File } from 'src/entities/file.entity';

import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { FileDAO } from 'src/entities/dao/file.dao';

import { JackettModule } from 'src/modules/jackett/jackett.module';
import { LibraryModule } from 'src/modules/library/library.module';
import { TransmissionModule } from 'src/modules/transmission/transmission.module';
import { TMDBModule } from 'src/modules/tmdb/tmdb.module';
import { ParamsModule } from 'src/modules/params/params.module';

import { DownloadProcessor } from './processors/download.processor';
import { RefreshTorrentProcessor } from './processors/refresh-torrent.processor';
import { OrganizeProcessor } from './processors/organize.processor';
import { ScanLibraryProcessor } from './processors/scan-library.processor';

import { JobsService } from './jobs.service';
import { JobsResolver } from './jobs.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movie,
      Torrent,
      TVSeason,
      TVEpisode,
      File,
    ]),
    BullModule.forRoot({
      connection: REDIS_CONFIG,
    }),
    BullModule.registerQueue(
      {
        name: JobsQueue.REFRESH_TORRENT,
        defaultJobOptions: { removeOnFail: 100, removeOnComplete: 100 },
      },
      {
        name: JobsQueue.DOWNLOAD,
        defaultJobOptions: { removeOnFail: 100, removeOnComplete: 100 },
      },
      {
        name: JobsQueue.RENAME_AND_LINK,
        defaultJobOptions: { removeOnFail: 100, removeOnComplete: 100 },
      },
      {
        name: JobsQueue.SCAN_LIBRARY,
        defaultJobOptions: { removeOnFail: 100, removeOnComplete: 100 },
      }
    ),
    JackettModule,
    TransmissionModule,
    TMDBModule,
    ParamsModule,
    forwardRef(() => LibraryModule),
  ],
  providers: [
    DownloadProcessor,
    RefreshTorrentProcessor,
    OrganizeProcessor,
    ScanLibraryProcessor,
    JobsService,
    JobsResolver,
    MovieDAO,
    TorrentDAO,
    TVSeasonDAO,
    TVEpisodeDAO,
    FileDAO,
  ],
  exports: [JobsService],
})
export class JobsModule {}