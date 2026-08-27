import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Torrent } from '../torrent.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class TorrentDAO extends BaseDAO<Torrent> {
  public constructor(
    @InjectRepository(Torrent) repository: Repository<Torrent>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): TorrentDAO {
    return new TorrentDAO(manager.getRepository(Torrent));
  }
}