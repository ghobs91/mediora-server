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
    const service = new AuthService(
      { sign } as unknown as JwtService,
      { findOne: jest.fn().mockResolvedValue(undefined) } as any
    );

    await expect(service.login('secret')).resolves.toEqual({ token: 'token' });
    expect(sign).toHaveBeenCalledWith({ sub: 'bobarr' });
  });

  it('rejects a wrong password', async () => {
    const AuthService = await loadAuthService('secret');
    const service = new AuthService({
      sign: jest.fn(),
    } as unknown as JwtService, { findOne: jest.fn() } as any);

    await expect(service.login('nope')).rejects.toThrow('Invalid password');
  });

  it('rejects any password when none is configured', async () => {
    const AuthService = await loadAuthService(undefined);
    const service = new AuthService({
      sign: jest.fn(),
    } as unknown as JwtService, { findOne: jest.fn() } as any);

    await expect(service.login('anything')).rejects.toThrow(
      'APP_PASSWORD is not set'
    );
  });

  it('stores a salted password hash and verifies it later', async () => {
    const AuthService = await loadAuthService(undefined);
    let storedValue: string | undefined;
    const sign = jest.fn().mockReturnValue('token');
    const parameterDAO = {
      findOne: jest.fn().mockImplementation(async () =>
        storedValue ? { value: storedValue } : undefined
      ),
      findOrCreate: jest.fn().mockImplementation(async ({ value }) => {
        storedValue = value;
        return { id: 1 };
      }),
      save: jest.fn(),
    };
    const service = new AuthService(
      { sign } as unknown as JwtService,
      parameterDAO as any
    );

    await service.setPassword('secret');
    expect(storedValue).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    await expect(service.login('secret')).resolves.toEqual({ token: 'token' });
    await expect(service.login('wrong')).rejects.toThrow('Invalid password');
    expect(parameterDAO.save).toHaveBeenCalledWith({
      id: 1,
      value: storedValue,
    });
  });
});
