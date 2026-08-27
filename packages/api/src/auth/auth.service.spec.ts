import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  const loadAuthService = async (password: string | undefined) => {
    jest.resetModules();
    if (password === undefined) {
      delete process.env.APP_PASSWORD;
    } else {
      process.env.APP_PASSWORD = password;
    }
    process.env.JWT_SECRET = 'test-secret';
    const { AuthService } = await import('./auth.service');
    return AuthService;
  };

  it('signs a token for the correct password', async () => {
    const AuthService = await loadAuthService('secret');
    const sign = jest.fn().mockReturnValue('token');
    const service = new AuthService({ sign } as unknown as JwtService);

    expect(service.login('secret')).toEqual({ token: 'token' });
    expect(sign).toHaveBeenCalledWith({ sub: 'bobarr' });
  });

  it('rejects a wrong password', async () => {
    const AuthService = await loadAuthService('secret');
    const service = new AuthService({
      sign: jest.fn(),
    } as unknown as JwtService);

    expect(() => service.login('nope')).toThrow('Invalid password');
  });

  it('rejects any password when none is configured', async () => {
    const AuthService = await loadAuthService(undefined);
    const service = new AuthService({
      sign: jest.fn(),
    } as unknown as JwtService);

    expect(() => service.login('anything')).toThrow(
      'APP_PASSWORD is not set'
    );
  });
});
