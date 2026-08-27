import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { File } from '../file.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class FileDAO extends BaseDAO<File> {
  public constructor(
    @InjectRepository(File) repository: Repository<File>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): FileDAO {
    return new FileDAO(manager.getRepository(File));
  }
}