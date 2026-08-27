import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { MediaView } from '../media-view.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class MediaViewDAO extends BaseDAO<MediaView> {
  public constructor(
    @InjectRepository(MediaView) repository: Repository<MediaView>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): MediaViewDAO {
    return new MediaViewDAO(manager.getRepository(MediaView));
  }
}