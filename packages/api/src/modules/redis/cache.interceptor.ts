import {
  ExecutionContext,
  Injectable,
  mixin,
  NestInterceptor,
  CallHandler,
  Type,
} from '@nestjs/common';

import { from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { RedisService } from './redis.service';
import { CacheKeys } from './cache.dto';

const DEFAULT_STALE_TTL = 1000 * 60 * 60 * 24 * 90; // ninety days

/**
 * Cache access is best-effort: a Redis outage degrades to uncached calls
 * instead of failing the request. Read paths also keep a long-lived shadow
 * copy of every successful result, which is served when the upstream call
 * fails (stale-while-error).
 */
async function readCache(
  redis: RedisService | undefined,
  key: string
): Promise<string | null> {
  if (!redis) return null;

  try {
    return (await redis.get(key)) ?? null;
  } catch {
    return null;
  }
}

async function writeCache(
  redis: RedisService | undefined,
  key: string,
  value: string,
  ttl: number
): Promise<void> {
  if (!redis) return;

  try {
    await redis.set(key, value, ttl);
  } catch {
    // Cache writes are never allowed to fail a request.
  }
}

function parseCached<TData>(raw: string): TData | null {
  try {
    return JSON.parse(raw) as TData;
  } catch {
    return null;
  }
}

function warn(context: unknown, message: string, details: object) {
  (context as { logger?: { warn?: (msg: string, meta?: object) => void } })
    .logger?.warn?.(message, details);
}

export function CacheMethod({
  key,
  ttl,
  staleTtl = DEFAULT_STALE_TTL,
}: {
  key: CacheKeys;
  ttl: number;
  staleTtl?: number;
}) {
  return function (
    _target: Record<string, any>,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const computedCacheKey = `${key}_${
        args.length ? args.map((arg) => JSON.stringify(arg)) : 'no_args'
      }`;
      const staleCacheKey = `${computedCacheKey}|stale`;
      const redis: RedisService | undefined = (this as any).redisService;

      const cachedResult = await readCache(redis, computedCacheKey);
      if (cachedResult) {
        const parsed = parseCached(cachedResult);
        if (parsed !== null) return parsed;
      }

      try {
        const result = await method.apply(this, args);
        const serialized = JSON.stringify(result);

        await writeCache(redis, computedCacheKey, serialized, ttl);
        await writeCache(redis, staleCacheKey, serialized, staleTtl);

        return result;
      } catch (error) {
        const stale = await readCache(redis, staleCacheKey);
        if (stale) {
          const parsed = parseCached(stale);
          if (parsed !== null) {
            warn(this, 'upstream call failed, serving stale cache', {
              key: computedCacheKey,
              error: error instanceof Error ? error.message : String(error),
            });
            return parsed;
          }
        }

        throw error;
      }
    };
  };
}

@Injectable()
export abstract class CacheInterceptor implements NestInterceptor {
  protected abstract readonly ttl: number;
  protected abstract readonly key: CacheKeys;

  public constructor(private readonly redisService: RedisService) {}

  public async intercept(context: ExecutionContext, next: CallHandler) {
    const [, params] = context.getArgs();
    const key = `${this.key}_${JSON.stringify(params)}`;

    const cachedResult = await readCache(this.redisService, key);
    if (cachedResult) {
      const parsed = parseCached(cachedResult);
      if (parsed !== null) return of(parsed);
    }

    return next.handle().pipe(
      map((data) => {
        const serialized = JSON.stringify(data);
        void writeCache(this.redisService, key, serialized, this.ttl);
        void writeCache(
          this.redisService,
          `${key}|stale`,
          serialized,
          DEFAULT_STALE_TTL
        );
        return data;
      }),
      catchError((error) => from(this.fallback(key, error)))
    );
  }

  private async fallback(key: string, error: unknown): Promise<unknown> {
    const stale = await readCache(this.redisService, `${key}|stale`);

    if (stale) {
      const parsed = parseCached(stale);
      if (parsed !== null) {
        warn(this, 'query failed, serving stale cache', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        return parsed;
      }
    }

    throw error;
  }
}

export const makeCacheInterceptor: ({
  key,
  ttl,
}: {
  key: CacheKeys;
  ttl: number;
}) => Type<NestInterceptor> = ({ key, ttl }) =>
  mixin(
    class extends CacheInterceptor {
      protected readonly ttl = ttl;
      protected readonly key = key;
    }
  );
