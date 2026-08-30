import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { env } from 'src/env';

@Injectable()
export class XApiKeyGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-Api-Key header');
    }

    if (apiKey !== env.SONARR_RADARR_API_KEY) {
      throw new UnauthorizedException('Invalid X-Api-Key header');
    }

    return true;
  }
}
