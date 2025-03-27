import { Redis } from 'ioredis';
import { Logger } from '../../../../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

export interface CacheQueryOptions extends CacheOptions {
  keyPrefix?: string;
}

/**
 * Cache manager for repository data using Redis
 */
export class CacheManager {
  private readonly logger: Logger;
  private readonly defaultTTL: number = 3600; // 1 hour default TTL

  constructor(
    private readonly redis: Redis,
    private readonly options: CacheOptions = {}
  ) {
    this.logger = new Logger('CacheManager');
  }

  /**
   * Generate cache key with optional prefix
   */
  private generateKey(key: string): string {
    const prefix = this.options.prefix ? `${this.options.prefix}:` : '';
    return `${prefix}${key}`;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl ?? this.options.ttl ?? this.defaultTTL;

      await this.redis.setex(cacheKey, cacheTTL, serializedValue);
    } catch (error) {
      this.logger.error('Failed to set cache:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key);
      const value = await this.redis.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Failed to get from cache:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.error('Failed to delete from cache:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Clear all cached values with prefix
   */
  async clear(): Promise<void> {
    try {
      if (this.options.prefix) {
        const keys = await this.redis.keys(`${this.options.prefix}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      this.logger.error('Failed to clear cache:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

/**
 * Cache query decorator factory
 */
export function CacheQuery(options: CacheQueryOptions = {}) {
  return function (
    target: object | Function,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const keyPrefix = options.keyPrefix ?? target.constructor.name;

    descriptor.value = async function (this: { cacheManager: CacheManager }, ...args: unknown[]): Promise<unknown> {
      try {
        const cacheKey = `${keyPrefix}:${String(propertyKey)}:${JSON.stringify(args)}`;
        const cachedResult = await this.cacheManager.get(cacheKey);

        if (cachedResult) {
          return cachedResult;
        }

        const result = await originalMethod.apply(this, args);
        await this.cacheManager.set(cacheKey, result, options.ttl);
        return result;
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator factory
 */
export function CacheInvalidate() {
  return function (
    _target: object | Function,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { cacheManager: CacheManager }, ...args: unknown[]): Promise<unknown> {
      try {
        const result = await originalMethod.apply(this, args);
        await this.cacheManager.clear();
        return result;
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}