import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';

import { AuthService } from 'src/auth/auth.service';
import { Public } from 'src/auth/public.decorator';

import { SetupService } from './setup.service';
import { SetupStateService } from './setup-state.service';

@Public()
@Controller('setup')
export class SetupController {
  public constructor(
    private readonly setupService: SetupService,
    private readonly setupState: SetupStateService,
    private readonly authService: AuthService
  ) {}

  @Get('status')
  public status() {
    return this.setupState.getStatus();
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
