import { CacheKeys } from './cache.dto';
import { CacheMethod } from './cache.interceptor';

class FakeRedis {
  public readonly store = new Map<string, string>();
  public failing = false;

  public async get(key: string): Promise<string | null> {
    if (this.failing) throw new Error('redis down');
    return this.store.get(key) ?? null;
  }

  public async set(key: string, value: string): Promise<'OK'> {
    if (this.failing) throw new Error('redis down');
    this.store.set(key, value);
    return 'OK';
  }
}

describe('CacheMethod', () => {
  const cacheKey = `${CacheKeys.TMDB_GET_MOVIE}_no_args`;

  const buildService = (redis: FakeRedis) => {
    class Service {
      public readonly redisService = redis;
      public readonly logger = { warn: jest.fn() };
      public calls = 0;
      public failing = false;

      @CacheMethod({ key: CacheKeys.TMDB_GET_MOVIE, ttl: 1000 })
      public async load() {
        this.calls += 1;
        if (this.failing) throw new Error('tmdb down');
        return { title: 'The Nanny Diaries' };
      }
    }

    return new Service();
  };

  it('caches successful results', async () => {
    const service = buildService(new FakeRedis());

    await expect(service.load()).resolves.toEqual({
      title: 'The Nanny Diaries',
    });
    await expect(service.load()).resolves.toEqual({
      title: 'The Nanny Diaries',
    });

    expect(service.calls).toBe(1);
  });

  it('serves the stale copy when the upstream call fails', async () => {
    const redis = new FakeRedis();
    const service = buildService(redis);

    await service.load();
    redis.store.delete(cacheKey); // simulate an expired fresh entry
    service.failing = true;

    await expect(service.load()).resolves.toEqual({
      title: 'The Nanny Diaries',
    });
    expect(service.calls).toBe(2);
  });

  it('propagates the error when nothing has been cached yet', async () => {
    const service = buildService(new FakeRedis());
    service.failing = true;

    await expect(service.load()).rejects.toThrow('tmdb down');
  });

  it('keeps working when redis itself is unavailable', async () => {
    const redis = new FakeRedis();
    redis.failing = true;
    const service = buildService(redis);

    await expect(service.load()).resolves.toEqual({
      title: 'The Nanny Diaries',
    });
    expect(service.calls).toBe(1);
  });
});
