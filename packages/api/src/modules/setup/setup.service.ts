import { ConflictException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { ParameterKey, OrganizeLibraryStrategy } from 'src/app.dto';
import { ParameterDAO } from 'src/entities/dao/parameter.dao';
import { AuthService } from 'src/auth/auth.service';

import { SetupStateService } from './setup-state.service';

export const setupInputSchema = z.object({
  password: z.string().min(8).max(256),
  tmdbApiKey: z.string().trim().min(1).max(256),
  jackettApiKey: z.string().trim().min(1).max(256),
  region: z.string().trim().min(2).max(8),
  language: z.string().trim().min(2).max(16),
  organizeLibraryStrategy: z
    .nativeEnum(OrganizeLibraryStrategy)
    .default(OrganizeLibraryStrategy.LINK),
});

export type SetupInput = z.infer<typeof setupInputSchema>;

@Injectable()
export class SetupService {
  public constructor(
    private readonly parameterDAO: ParameterDAO,
    private readonly authService: AuthService,
    private readonly setupState: SetupStateService
  ) {}

  public async complete(input: unknown) {
    const values = setupInputSchema.parse(input);

    if (!(await this.setupState.isSetupRequired())) {
      throw new ConflictException('SETUP_ALREADY_COMPLETED');
    }

    const params: Array<[ParameterKey, string]> = [
      [ParameterKey.TMDB_API_KEY, values.tmdbApiKey],
      [ParameterKey.JACKETT_API_KEY, values.jackettApiKey],
      [ParameterKey.REGION, values.region],
      [ParameterKey.LANGUAGE, values.language],
      [
        ParameterKey.ORGANIZE_LIBRARY_STRATEGY,
        values.organizeLibraryStrategy,
      ],
    ];

    for (const [key, value] of params) {
      const parameter = await this.parameterDAO.findOrCreate({ key, value });
      await this.parameterDAO.save({ id: parameter.id, value });
    }

    await this.authService.setPassword(values.password);
    await this.setupState.markComplete();

    return { success: true, message: 'SETUP_COMPLETED' };
  }
}
