import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Parameter } from '../parameter.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class ParameterDAO extends BaseDAO<Parameter> {
  public constructor(
    @InjectRepository(Parameter) repository: Repository<Parameter>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): ParameterDAO {
    return new ParameterDAO(manager.getRepository(Parameter));
  }

  public async findOrCreate({
    key,
    value,
  }: {
    key: Parameter['key'];
    value: Parameter['value'];
  }) {
    const param = await this.findOne({ where: { key } });
    return param || this.save({ key, value });
  }
}