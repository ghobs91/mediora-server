import { ConflictException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { ParameterKey, OrganizeLibraryStrategy } from 'src/app.dto';
import { ParameterDAO } from 'src/entities/dao/parameter.dao';
import { AuthService } from 'src/auth/auth.service';
import { env } from 'src/env';
import { LibraryFoldersService } from 'src/modules/library/library-folders.service';

import { SetupStateService } from './setup-state.service';

export const setupInputSchema = z.object({
  password: z.string().min(8).max(256),
  tmdbApiKey: z.string().trim().min(1).max(256),
  jackettApiKey: z.string().trim().min(1).max(256),
  region: z.string().trim().min(2).max(8),
  language: z.string().trim().min(2).max(16),
  moviesFolderName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .default(env.LIBRARY_MOVIES_FOLDER_NAME),
  tvShowsFolderName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .default(env.LIBRARY_TV_SHOWS_FOLDER_NAME),
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
    private readonly setupState: SetupStateService,
    private readonly libraryFoldersService: LibraryFoldersService
  ) {}

  public async complete(input: unknown) {
    const values = setupInputSchema.parse(input);

    if (!(await this.setupState.isSetupRequired())) {
      throw new ConflictException('SETUP_ALREADY_COMPLETED');
    }

    await this.libraryFoldersService.updateFolderNames({
      movies: values.moviesFolderName,
      tvshows: values.tvShowsFolderName,
    });

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
