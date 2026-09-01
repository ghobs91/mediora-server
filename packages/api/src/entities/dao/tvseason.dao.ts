import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { DownloadableMediaState } from 'src/app.dto';

import { TVSeason } from '../tvseason.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class TVSeasonDAO extends BaseDAO<TVSeason> {
  public constructor(
    @InjectRepository(TVSeason) repository: Repository<TVSeason>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): TVSeasonDAO {
    return new TVSeasonDAO(manager.getRepository(TVSeason));
  }

  public async inLibrary(tvShowTMDBId: number, seasonNumber: number) {
    const match = await this.createQueryBuilder('tvSeason')
      .innerJoinAndSelect(
        'tvSeason.tvShow',
        'tvShow',
        'tvShow.tmdbId = :tvShowTMDBId',
        { tvShowTMDBId }
      )
      .where('tvSeason.seasonNumber = :seasonNumber', { seasonNumber })
      .getOne();
    return match !== null && match !== undefined;
  }

  public async findOneByTmdbAndSeason(
    tvShowTMDBId: number,
    seasonNumber: number,
  ) {
    return this.createQueryBuilder('tvSeason')
      .innerJoinAndSelect(
        'tvSeason.tvShow',
        'tvShow',
        'tvShow.tmdbId = :tvShowTMDBId',
        { tvShowTMDBId }
      )
      .where('tvSeason.seasonNumber = :seasonNumber', { seasonNumber })
      .getOne();
  }

  public async findOrCreate(
    seasonAttributes: {
      tvShowId: number;
      seasonNumber: number;
    },
    defaultState?: DownloadableMediaState
  ) {
    const match = await this.findOne({ where: seasonAttributes });
    return (
      match || (await this.save({ ...seasonAttributes, state: defaultState }))
    );
  }
}