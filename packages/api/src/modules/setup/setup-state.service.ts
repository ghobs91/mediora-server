import { Injectable } from '@nestjs/common';

import { ParameterKey } from 'src/app.dto';
import { ParameterDAO } from 'src/entities/dao/parameter.dao';
import { env } from 'src/env';

export interface SetupStatus {
  setupRequired: boolean;
  hasTmdbApiKey: boolean;
  hasJackettApiKey: boolean;
  hasPassword: boolean;
}

@Injectable()
export class SetupStateService {
  private setupRequiredCache: boolean | undefined;

  public constructor(private readonly parameterDAO: ParameterDAO) {}

  public async getStatus(): Promise<SetupStatus> {
    const [completed, tmdbApiKey, jackettApiKey, passwordHash] =
      await Promise.all([
        this.parameterDAO.findOne({ where: { key: ParameterKey.SETUP_COMPLETED } }),
        this.parameterDAO.findOne({ where: { key: ParameterKey.TMDB_API_KEY } }),
        this.parameterDAO.findOne({ where: { key: ParameterKey.JACKETT_API_KEY } }),
        this.parameterDAO.findOne({
          where: { key: ParameterKey.AUTH_PASSWORD_HASH },
        }),
      ]);

    const hasTmdbApiKey = Boolean(tmdbApiKey?.value);
    const hasJackettApiKey = Boolean(jackettApiKey?.value);
    const hasPassword = Boolean(passwordHash?.value || env.APP_PASSWORD);
    const isLegacyConfigured = hasTmdbApiKey && hasJackettApiKey;
    const setupRequired =
      completed?.value !== 'true' && !isLegacyConfigured;

    this.setupRequiredCache = setupRequired;

    return {
      setupRequired,
      hasTmdbApiKey,
      hasJackettApiKey,
      hasPassword,
    };
  }

  public async isSetupRequired() {
    if (this.setupRequiredCache !== undefined) {
      return this.setupRequiredCache;
    }

    return (await this.getStatus()).setupRequired;
  }

  public async markComplete() {
    const existing = await this.parameterDAO.findOrCreate({
      key: ParameterKey.SETUP_COMPLETED,
      value: 'true',
    });

    await this.parameterDAO.save({ id: existing.id, value: 'true' });
    this.setupRequiredCache = false;
  }
}
