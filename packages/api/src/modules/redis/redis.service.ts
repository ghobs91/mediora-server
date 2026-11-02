import Redis from 'ioredis';
import { Injectable, Inject } from '@nestjs/common';
import { forEach } from 'p-iteration';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { REDIS_CONFIG, DEBUG_REDIS } from 'src/config';
import { CacheKeys } from './cache.dto';

@Injectable()
export class RedisService {
  private client: Redis;
  private lastErrorLog = 0;

  public constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {
    this.logger = logger.child({ context: 'RedisService' });
    this.client = new Redis({
      db: 0,
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
      password: REDIS_CONFIG.password,
      connectTimeout: 3000,
      // Fail fast instead of queueing commands while disconnected: redis only
      // backs caches here, so callers can carry on without it.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (error: Error) => {
      const now = Date.now();
      if (now - this.lastErrorLog < 60000) return;
      this.lastErrorLog = now;
      this.logger.warn('redis unavailable, continuing without cache', {
        error: error.message,
      });
    });
  }

  public clearCache() {
    if (DEBUG_REDIS) this.logger.info('clear cache');
    return forEach(Object.entries(CacheKeys), ([, value]) =>
      this.deleteKeysPattern(value)
    );
  }

  public get(key: string) {
    if (DEBUG_REDIS) this.logger.info('get key', { key });
    return this.client.get(key);
  }

  public set(key: string, data: string, ttl: number) {
    if (DEBUG_REDIS) this.logger.info('set key', { key });
    return this.client.set(key, data, 'PX', ttl);
  }

  public async deleteKeysPattern(key: CacheKeys) {
    if (DEBUG_REDIS) this.logger.info('delete key', { key });
    const keys = await this.client.keys(`${key}*`);
    await Promise.all(keys.map((_) => this.client.del(_)));
  }

  // Releases rejected because their download had no English audio or used an
  // ignored codec. Blocking them keeps the download loop from re-picking the
  // same release.
  public async addRejectedTitle(title: string) {
    await this.client.sadd('rejected_titles', title);
    await this.client.expire('rejected_titles', 60 * 60 * 24 * 30);
  }

  public async getRejectedTitles(): Promise<string[]> {
    try {
      return await this.client.smembers('rejected_titles');
    } catch {
      return [];
    }
  }

  // Infohash blocklist: exact even when the Jackett title/magnet name is
  // truncated, so a rejected H264/foreign release cannot be re-added.
  public async addRejectedHash(hash: string) {
    const normalized = hash.toLowerCase();
    await this.client.sadd('rejected_hashes', normalized);
    await this.client.expire('rejected_hashes', 60 * 60 * 24 * 30);
  }

  public async getRejectedHashes(): Promise<string[]> {
    try {
      return await this.client.smembers('rejected_hashes');
    } catch {
      return [];
    }
  }
}
