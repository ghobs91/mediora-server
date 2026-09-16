import { randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { map, forEachSeries } from 'p-iteration';

import { DataSource, EntityManager, Not, In, IsNull } from 'typeorm';

import { ParameterKey, OrganizeLibraryStrategy } from 'src/app.dto';
import { TransactionManager, LazyTransaction, Transaction } from 'src/utils/transaction';
import { env } from 'src/env';

import { Entertainment } from 'src/modules/tmdb/tmdb.dto';

import { ParameterDAO } from 'src/entities/dao/parameter.dao';
import { QualityDAO } from 'src/entities/dao/quality.dao';
import { TagDAO } from 'src/entities/dao/tag.dao';
import { Quality } from 'src/entities/quality.entity';

import { TagInput, QualityInput } from './params.dto';

@Injectable()
export class ParamsService {
  public constructor(
    private readonly dataSource: DataSource,
    private readonly parameterDAO: ParameterDAO,
    private readonly qualityDAO: QualityDAO,
    private readonly tagDAO: TagDAO
  ) {
    this.initializeParamsStore(null);
    this.initializeQuality(null);
  }

  @LazyTransaction()
  public async initializeParamsStore(
    @TransactionManager() manager: EntityManager | null
  ) {
    const defaultParams: Array<[ParameterKey, string]> = [
      [ParameterKey.LANGUAGE, 'en'],
      [ParameterKey.REGION, 'US'],
      [ParameterKey.TMDB_API_KEY, ''],
      [ParameterKey.MAX_MOVIE_DOWNLOAD_SIZE, (20e9).toString()], // max file size 20gb
      [ParameterKey.MAX_TVSHOW_EPISODE_DOWNLOAD_SIZE, (5e9).toString()], // max file size 5gb
      [ParameterKey.JACKETT_API_KEY, ''],
      [ParameterKey.SONARR_RADARR_API_KEY, this.getInitialApiKey()],
      [ParameterKey.ORGANIZE_LIBRARY_STRATEGY, OrganizeLibraryStrategy.LINK],
      [ParameterKey.LIBRARY_MOVIES_FOLDER_NAME, env.LIBRARY_MOVIES_FOLDER_NAME],
      [ParameterKey.LIBRARY_TV_SHOWS_FOLDER_NAME, env.LIBRARY_TV_SHOWS_FOLDER_NAME],
    ];

    await map(defaultParams, ([key, value]) =>
      ParameterDAO.fromManager(manager!).findOrCreate({ key, value })
    );
  }

  @LazyTransaction()
  public async initializeQuality(
    @TransactionManager() manager: EntityManager | null
  ) {
    const qualityDAO = QualityDAO.fromManager(manager!);
    const defaultQualities: Array<
      Omit<Quality, 'id' | 'createdAt' | 'updatedAt' | 'maxSize'> & {
        maxSize?: number | null;
      }
    > = [
      {
        type: Entertainment.Movie,
        name: '4K',
        match: ['uhd', '4k', '2160', '2160p'],
        score: 4,
      },
      {
        type: Entertainment.Movie,
        name: '1440p',
        match: ['1440', '1440p'],
        score: 3,
      },
      {
        type: Entertainment.Movie,
        name: '1080p',
        match: ['1080', '1080p'],
        score: 2,
      },
      {
        type: Entertainment.Movie,
        name: '720p',
        match: ['720', '720p'],
        score: 1,
      },
      {
        type: Entertainment.TvShow,
        name: '4K',
        match: ['uhd', '4k', '2160', '2160p'],
        score: 4,
      },
      {
        type: Entertainment.TvShow,
        name: '1440p',
        match: ['1440', '1440p'],
        score: 3,
      },
      {
        type: Entertainment.TvShow,
        name: '1080p',
        match: ['1080', '1080p'],
        score: 2,
      },
      {
        type: Entertainment.TvShow,
        name: '720p',
        match: ['720', '720p'],
        score: 1,
      },
    ];

    await map(defaultQualities, async (quality) => {
      const match = await qualityDAO.findOne({
        where: { name: quality.name, type: quality.type },
      });

      if (!match) {
        await qualityDAO.save(quality);
      }
    });
  }

  /**
   * The API key the Mediora client uses to talk to the Sonarr/Radarr compatible
   * endpoints. It is generated once and persisted in the parameter store, so it
   * survives restarts and can be shown in the web settings page. A legacy
   * `SONARR_RADARR_API_KEY` env value seeds it on the first launch.
   */
  private getInitialApiKey() {
    const configured = env.SONARR_RADARR_API_KEY?.trim();
    if (configured && configured !== 'change-me') {
      return configured;
    }

    return randomBytes(32).toString('hex');
  }

  public async get(key: ParameterKey) {
    const param = await this.parameterDAO.findOne({ where: { key } });
    return param?.value || '';
  }

  public async update(key: ParameterKey, value: string) {
    const param = await this.parameterDAO.findOrCreate({ key, value });
    await this.parameterDAO.save({ id: param.id, value });
  }

  public async getNumber(key: ParameterKey) {
    const param = await this.parameterDAO.findOne({ where: { key } });
    return param?.value ? parseInt(param.value, 10) : 0;
  }

  public async getList(key: ParameterKey) {
    const param = await this.parameterDAO.findOne({ where: { key } });
    return param?.value ? param.value.split(',') : [];
  }

  public async getQualities(type?: Entertainment) {
    const qualities = await this.qualityDAO.find({
      order: { type: 'ASC', score: 'DESC' },
    });
    return type === Entertainment.Movie
      ? qualities.filter((q) => q.type === Entertainment.Movie)
      : qualities.filter((q) => q.type === Entertainment.TvShow);
  }

  public async getQualityById(id: number) {
    return this.qualityDAO.findOne({ where: { id } });
  }

  @Transaction()
  public async updateQualities(
    type: Entertainment,
    qualities: QualityInput[],
    @TransactionManager() manager?: EntityManager
  ) {
    const qualityDAO = QualityDAO.fromManager(manager!);
    const ids = qualities
      .map((quality) => quality.id)
      .filter((id): id is number => typeof id === 'number');

    await qualityDAO.delete(
      ids.length > 0 ? { type, id: Not(In(ids)) } : { type }
    );

    await forEachSeries(qualities, (quality) =>
      qualityDAO.save({
        ...(quality.id ? { id: quality.id } : {}),
        name: quality.name,
        match: quality.match,
        maxSize: quality.maxSize ?? null,
        score: quality.score,
        type,
      })
    );
  }

  public getTags() {
    return this.tagDAO.find({ order: { score: 'DESC' } });
  }

  @Transaction()
  public async updateTags(
    tags: TagInput[],
    @TransactionManager() manager?: EntityManager
  ) {
    const tagDAO = TagDAO.fromManager(manager!);
    await tagDAO.delete(
      tags.length > 0
        ? { name: Not(In(tags.map((tag) => tag.name))) }
        : { id: Not(IsNull()) }
    );
    await forEachSeries(tags, async (tag) => {
      const match = await tagDAO.findOne({ where: { name: tag.name } });
      return match
        ? await tagDAO.save({ id: match.id, score: tag.score })
        : await tagDAO.save(tag);
    });
  }
}
