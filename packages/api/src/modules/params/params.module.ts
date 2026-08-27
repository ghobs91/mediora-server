import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from 'src/modules/redis/redis.module';

import { Parameter } from 'src/entities/parameter.entity';
import { Quality } from 'src/entities/quality.entity';
import { Tag } from 'src/entities/tag.entity';

import { ParameterDAO } from 'src/entities/dao/parameter.dao';
import { QualityDAO } from 'src/entities/dao/quality.dao';
import { TagDAO } from 'src/entities/dao/tag.dao';

import { ParamsResolver } from './params.resolver';
import { ParamsService } from './params.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parameter, Quality, Tag]),
    RedisModule,
  ],
  providers: [ParamsResolver, ParamsService, ParameterDAO, QualityDAO, TagDAO],
  exports: [ParamsService],
})
export class ParamsModule {}
