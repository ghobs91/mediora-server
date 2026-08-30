import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { DownloadableMediaState } from 'src/app.dto';

import { TVEpisode } from '../tvepisode.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class TVEpisodeDAO extends BaseDAO<TVEpisode> {
  public constructor(
    @InjectRepository(TVEpisode) repository: Repository<TVEpisode>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): TVEpisodeDAO {
    return new TVEpisodeDAO(manager.getRepository(TVEpisode));
  }

  public async findOrCreate(episodeAttributes: {
    seasonId: number;
    tvShowId: number;
    episodeNumber: number;
    seasonNumber: number;
  }) {
    const match = await this.findOne({ where: episodeAttributes });
    return match || (await this.save(episodeAttributes));
  }

  public findMissingFromLibrary() {
    return this.createQueryBuilder('episode')
      .leftJoinAndSelect('episode.tvShow', 'tvShow')
      .innerJoin('episode.season', 'season', 'season.state != :seasonState', {
        seasonState: DownloadableMediaState.DOWNLOADING,
      })
      .where('episode.state = :episodeState', {
        episodeState: DownloadableMediaState.MISSING,
      })
      .andWhere('season.monitored = :monitored', { monitored: true })
      .orderBy('episode.tvShow', 'DESC')
      .addOrderBy('episode.season', 'DESC')
      .addOrderBy('episode.episodeNumber', 'DESC')
      .getMany();
  }
}