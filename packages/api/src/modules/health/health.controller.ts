import { Controller, Get } from '@nestjs/common';

import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorService,
} from '@nestjs/terminus';
import axios from 'axios';
import { DataSource } from 'typeorm';

import { Public } from 'src/auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  public constructor(
    private health: HealthCheckService,
    private healthIndicatorService: HealthIndicatorService,
    private dataSource: DataSource
  ) {}

  @Get()
  @HealthCheck()
  public check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkTMDB(),
    ]);
  }

  private async checkDatabase() {
    const indicator = this.healthIndicatorService.check('database');
    try {
      await this.dataSource.query('SELECT 1');
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'db unreachable',
      });
    }
  }

  private async checkTMDB() {
    const indicator = this.healthIndicatorService.check('tmdb');

    try {
      await axios.get('https://www.themoviedb.org/', { timeout: 5000 });
      return indicator.up();
    } catch (_error) {
      return indicator.down({ message: 'unable to reach themoviedb.org' });
    }
  }
}