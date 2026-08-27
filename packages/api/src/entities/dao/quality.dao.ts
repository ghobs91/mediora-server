import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Quality } from '../quality.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class QualityDAO extends BaseDAO<Quality> {
  public constructor(
    @InjectRepository(Quality) repository: Repository<Quality>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): QualityDAO {
    return new QualityDAO(manager.getRepository(Quality));
  }
}