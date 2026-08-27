import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Torrent } from 'src/entities/torrent.entity';

import { TorrentDAO } from 'src/entities/dao/torrent.dao';

import { TransmissionService } from './transmission.service';
import { TransmissionResolver } from './transmission.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Torrent])],
  providers: [TransmissionService, TransmissionResolver, TorrentDAO],
  exports: [TransmissionService],
})
export class TransmissionModule {}
