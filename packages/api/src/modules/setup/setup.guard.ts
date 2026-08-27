import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SetupStateService } from './setup-state.service';
import { IS_PUBLIC_KEY } from 'src/auth/public.decorator';

@Injectable()
export class SetupGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly setupState: SetupStateService
  ) {}

  public async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return !(await this.setupState.isSetupRequired());
  }
}
