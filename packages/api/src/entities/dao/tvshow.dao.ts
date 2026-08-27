import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';

import { TVShow } from '../tvshow.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class TVShowDAO extends BaseDAO<TVShow> {
  public constructor(
    @InjectRepository(TVShow) repository: Repository<TVShow>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): TVShowDAO {
    return new TVShowDAO(manager.getRepository(TVShow));
  }

  public async findOrCreate(tvShowAttributes: DeepPartial<TVShow>) {
    if (!tvShowAttributes.tmdbId) {
      throw new Error('findOrCreate TVShow needs [tmdbId]');
    }

    const tvShow = await this.findOne({
      where: { tmdbId: tvShowAttributes.tmdbId },
    });

    return tvShow || this.save(tvShowAttributes);
  }
}