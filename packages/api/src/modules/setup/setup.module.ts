import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/auth/auth.module';
import { LibraryModule } from 'src/modules/library/library.module';
import { Parameter } from 'src/entities/parameter.entity';
import { ParameterDAO } from 'src/entities/dao/parameter.dao';

import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { SetupStateService } from './setup-state.service';

@Module({
  imports: [TypeOrmModule.forFeature([Parameter]), AuthModule, LibraryModule],
  controllers: [SetupController],
  providers: [
    SetupService,
    SetupStateService,
    ParameterDAO,
  ],
  exports: [SetupStateService],
})
export class SetupModule {}
