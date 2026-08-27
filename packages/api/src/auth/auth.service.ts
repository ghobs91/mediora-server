import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

import { env } from '../env';
import { ParameterDAO } from '../entities/dao/parameter.dao';
import { ParameterKey } from '../app.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly parameterDAO: ParameterDAO
  ) {}

  public async login(password: string) {
    const configuredHash = await this.parameterDAO.findOne({
      key: ParameterKey.AUTH_PASSWORD_HASH,
    });

    const isValid = configuredHash?.value
      ? await this.verifyPassword(password, configuredHash.value)
      : password === env.APP_PASSWORD;

    if (!isValid) {
      throw new UnauthorizedException(
        env.APP_PASSWORD || configuredHash?.value
          ? 'Invalid password'
          : 'APP_PASSWORD is not set, authentication is not configured'
      );
    }

    return { token: this.jwtService.sign({ sub: 'bobarr' }) };
  }

  public async setPassword(password: string) {
    const value = await this.hashPassword(password);
    const existing = await this.parameterDAO.findOrCreate({
      key: ParameterKey.AUTH_PASSWORD_HASH,
      value,
    });

    await this.parameterDAO.save({ id: existing.id, value });
  }

  private hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');

    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  private verifyPassword(password: string, storedValue: string) {
    const [salt, expectedHex] = storedValue.split(':');
    if (!salt || !expectedHex) return false;

    return new Promise<boolean>((resolve, reject) => {
      scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        const expected = Buffer.from(expectedHex, 'hex');
        resolve(
          expected.length === derivedKey.length &&
            timingSafeEqual(expected, derivedKey)
        );
      });
    });
  }
}
