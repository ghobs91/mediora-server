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

  /**
   * `File.path` is unique, so re-organizing a library entry that already has a
   * row (e.g. replacing a stale symlink with a real file) must update that row
   * instead of inserting a second one. A blind insert raises
   * `duplicate key value violates unique constraint`.
   */
  public async upsertByPath(attributes: {
    path: File['path'];
    movieId?: File['movieId'];
    tvEpisodeId?: File['tvEpisodeId'];
  }): Promise<File> {
    const existing = await this.findOne({ where: { path: attributes.path } });
    return this.save(
      existing ? { ...attributes, id: existing.id } : attributes
    );
  }
}
