import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { env } from '../env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: { cookies?: Record<string, string> }) =>
          request?.cookies?.bobarr_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: { sub?: string }) {
    if (!payload || payload.sub !== 'bobarr') {
      throw new UnauthorizedException();
    }

    return { id: payload.sub };
  }
}
