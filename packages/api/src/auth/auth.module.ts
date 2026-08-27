import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { env } from '../env';
import { Parameter } from '../entities/parameter.entity';
import { ParameterDAO } from '../entities/dao/parameter.dao';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Parameter]),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ParameterDAO],
  exports: [AuthService],
})
export class AuthModule {}
