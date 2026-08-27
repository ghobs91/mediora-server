import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { env } from '../env';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(password: string) {
    if (!env.APP_PASSWORD) {
      throw new UnauthorizedException(
        'APP_PASSWORD is not set, authentication is not configured'
      );
    }

    if (password !== env.APP_PASSWORD) {
      throw new UnauthorizedException('Invalid password');
    }

    return { token: this.jwtService.sign({ sub: 'bobarr' }) };
  }
}
