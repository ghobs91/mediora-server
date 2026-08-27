import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Movie } from '../movie.entity';
import { BaseDAO } from './base.dao';

@Injectable()
export class MovieDAO extends BaseDAO<Movie> {
  public constructor(
    @InjectRepository(Movie) repository: Repository<Movie>
  ) {
    super(repository);
  }

  public static fromManager(manager: EntityManager): MovieDAO {
    return new MovieDAO(manager.getRepository(Movie));
  }
}