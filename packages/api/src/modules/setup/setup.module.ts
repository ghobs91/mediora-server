import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/auth/auth.module';
import { ParameterDAO } from 'src/entities/dao/parameter.dao';

import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { SetupStateService } from './setup-state.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParameterDAO]), AuthModule],
  controllers: [SetupController],
  providers: [
    SetupService,
    SetupStateService,
  ],
  exports: [SetupStateService],
})
export class SetupModule {}
