import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';

import { AuthService } from 'src/auth/auth.service';
import { Public } from 'src/auth/public.decorator';

import { SetupService } from './setup.service';
import { SetupStateService } from './setup-state.service';
import { LibraryFoldersService } from 'src/modules/library/library-folders.service';

@Public()
@Controller('setup')
export class SetupController {
  public constructor(
    private readonly setupService: SetupService,
    private readonly setupState: SetupStateService,
    private readonly authService: AuthService,
    private readonly libraryFoldersService: LibraryFoldersService
  ) {}

  @Get('status')
  public async status() {
    const status = await this.setupState.getStatus();

    return {
      ...status,
      ...(status.setupRequired
        ? { library: await this.libraryFoldersService.inspect() }
        : {}),
    };
  }

  @Post('complete')
  public async complete(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.setupService.complete(body);
    const { token } = await this.authService.login(
      (body as { password?: string })?.password || ''
    );

    res.cookie('bobarr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { ...result, token };
  }
}
