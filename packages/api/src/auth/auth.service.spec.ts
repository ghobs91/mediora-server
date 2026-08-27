import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  const loadAuthService = (password: string | undefined) => {
    jest.resetModules();
    if (password === undefined) {
      delete process.env.APP_PASSWORD;
    } else {
      process.env.APP_PASSWORD = password;
    }
    process.env.JWT_SECRET = 'test-secret';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AuthService } = require('./auth.service');
    return AuthService as typeof import('./auth.service').AuthService;
  };

  it('signs a token for the correct password', () => {
    const AuthService = loadAuthService('secret');
    const sign = jest.fn().mockReturnValue('token');
    const service = new AuthService({ sign } as unknown as JwtService);

    expect(service.login('secret')).toEqual({ token: 'token' });
    expect(sign).toHaveBeenCalledWith({ sub: 'bobarr' });
  });

  it('rejects a wrong password', () => {
    const AuthService = loadAuthService('secret');
    const service = new AuthService({
      sign: jest.fn(),
    } as unknown as JwtService);

    expect(() => service.login('nope')).toThrow('Invalid password');
  });

  it('rejects any password when none is configured', () => {
    const AuthService = loadAuthService(undefined);
    const service = new AuthService({
      sign: jest.fn(),
    } as unknown as JwtService);

    expect(() => service.login('anything')).toThrow(
      'APP_PASSWORD is not set'
    );
  });
});
