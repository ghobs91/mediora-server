import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { verify } from 'jsonwebtoken';

import { env } from '../env';

/**
 * Allows mediora-server GraphQL queries to be called either with the web UI
 * JWT (`Authorization: Bearer <token>`) or with the Sonarr/Radarr compatible
 * API key (`X-Api-Key: <SONARR_RADARR_API_KEY>`).
 *
 * The native mediora client only stores the API key, so endpoints consumed by
 * it (currently the recommendations behind the /suggestions page) use this
 * guard together with `@Public()` (which opts out of the global JWT guard).
 */
@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = this.getRequest(context);
    const headers = request?.headers ?? {};

    const apiKey = headers['x-api-key'];
    if (
      env.SONARR_RADARR_API_KEY &&
      typeof apiKey === 'string' &&
      apiKey === env.SONARR_RADARR_API_KEY
    ) {
      return true;
    }

    const authorization =
      headers['authorization'] ?? headers['Authorization'];
    const token =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;

    if (token) {
      try {
        const payload = verify(token, env.JWT_SECRET) as { sub?: string };
        if (payload?.sub === 'mediora-server') {
          return true;
        }
      } catch {
        // fall through to the 401 below
      }
    }

    throw new UnauthorizedException('Missing or invalid credentials');
  }

  private getRequest(context: ExecutionContext) {
    try {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      if (gqlContext?.req) {
        return gqlContext.req;
      }
    } catch {
      // Not a GraphQL context - fall back to HTTP.
    }
    return context.switchToHttp().getRequest();
  }
}
