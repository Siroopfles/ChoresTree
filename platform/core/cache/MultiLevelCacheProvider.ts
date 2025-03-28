import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ICacheProvider } from './ICacheProvider';

/**
 * Multi-level cache provider implementatie
 * Gebruikt een hot (L1) en warm (L2) cache voor optimale performance
 */
@Injectable()
export class MultiLevelCacheProvider implements ICacheProvider {
  constructor(
    @Inject('HOT_CACHE') private hotCache: Cache,
    @Inject('WARM_CACHE') private warmCache: Cache,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Probeer eerst hot cache
    let value = await this.hotCache.get<T>(key);

    if (value !== null && value !== undefined) {
      return value;
    }

    // Als niet in hot cache, check warm cache
    value = await this.warmCache.get<T>(key);

    if (value !== null && value !== undefined) {
      // Warm cache hit - populate hot cache
      await this.hotCache.set(key, value, 300); // 5 min TTL
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Hot cache: 5 min TTL default
    await this.hotCache.set(key, value, ttl || 300);

    // Warm cache: 30 min TTL default
    await this.warmCache.set(key, value, ttl || 1800);
  }

  async invalidate(key: string): Promise<void> {
    await Promise.all([this.hotCache.del(key), this.warmCache.del(key)]);
  }
}
