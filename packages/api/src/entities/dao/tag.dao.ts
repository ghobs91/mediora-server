import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Tag } from '../tag.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class TagDAO extends BaseDAO<Tag> {
  public constructor(
    @InjectRepository(Tag) repository: Repository<Tag>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): TagDAO {
    return new TagDAO(manager.getRepository(Tag));
  }
}