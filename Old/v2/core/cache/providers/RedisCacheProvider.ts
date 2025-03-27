import { Redis } from 'ioredis';
import { Logger } from '../../../utils/logger';
import {
  CacheProvider,
  CacheProviderOptions,
  CacheStats,
  CacheOptions,
  CacheDependency,
  defaultStatsConverter
} from './CacheProvider';

export class RedisCacheProvider implements CacheProvider {
  private readonly logger: Logger;
  private stats: CacheStats;

  constructor(
    private readonly redis: Redis,
    private readonly options: CacheProviderOptions = {}
  ) {
    this.logger = new Logger('RedisCacheProvider');
    this.stats = this.initializeStats();
  }

  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      memoryUsed: 0,
      operations: 0,
      lastReset: new Date()
    };
  }

  private generateKey(key: string): string {
    return this.options.prefix ? `${this.options.prefix}:${key}` : key;
  }

  private async updateStats(hit: boolean): Promise<void> {
    if (this.options.monitoringEnabled) {
      hit ? this.stats.hits++ : this.stats.misses++;
      this.stats.operations++;
      
      if (this.stats.operations % 100 === 0) { // Update memory usage periodically
        const info = await this.redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) {
          this.stats.memoryUsed = parseInt(match[1], 10);
        }
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key);
      const value = await this.redis.get(cacheKey);
      
      await this.updateStats(!!value);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Cache get error:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      const finalTTL = options?.ttl ?? this.options.ttl;

      const pipeline = this.redis.pipeline();

      if (finalTTL) {
        pipeline.setex(cacheKey, finalTTL, serializedValue);
      } else {
        pipeline.set(cacheKey, serializedValue);
      }

      // Sla dependencies op indien aanwezig
      if (options?.dependencies?.length) {
        const dependencyKey = `${cacheKey}:deps`;
        pipeline.del(dependencyKey);
        pipeline.sadd(dependencyKey, ...options.dependencies.map(d => d.key));
      }

      // Sla tags op indien aanwezig
      if (options?.tags?.length) {
        const tagKeys = options.tags.map(tag => `tag:${tag}`);
        for (const tagKey of tagKeys) {
          pipeline.sadd(tagKey, cacheKey);
        }
      }

      await pipeline.exec();
      await this.updateStats(true);
    } catch (error) {
      this.logger.error('Cache set error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async invalidateDependencies(key: string, maxDepth = this.options.maxDependencyDepth ?? 3): Promise<void> {
    const visited = new Set<string>();
    const queue = [this.generateKey(key)];
    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      const currentKey = queue.shift()!;
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      const dependencyKey = `${currentKey}:deps`;
      const dependencies = await this.redis.smembers(dependencyKey);
      
      for (const dep of dependencies) {
        queue.push(this.generateKey(dep));
      }

      await this.redis.del(currentKey, dependencyKey);
      depth++;
    }
  }

  async getDependencies(key: string): Promise<CacheDependency[]> {
    const cacheKey = this.generateKey(key);
    const dependencyKey = `${cacheKey}:deps`;
    const dependencies = await this.redis.smembers(dependencyKey);
    
    return dependencies.map(dep => ({ key: dep }));
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const keys = await this.redis.smembers(tagKey);
    
    if (keys.length > 0) {
      await this.redis.del(...keys, tagKey);
    }
  }

  async getKeysByTag(tag: string): Promise<string[]> {
    const tagKey = `tag:${tag}`;
    return this.redis.smembers(tagKey);
  }

  async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.error('Cache delete error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.options.prefix) {
        const keys = await this.redis.keys(`${this.options.prefix}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      this.stats = this.initializeStats();
    } catch (error) {
      this.logger.error('Cache clear error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async writeThrough<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    await this.set(key, value, options);
  }

  async writeAround<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    await this.delete(key);
    await this.set(key, value, options);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async mget(keys: string[]): Promise<(unknown | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key));
      const values = await this.redis.mget(cacheKeys);
      
      await this.updateStats(true);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      this.logger.error('Cache mget error:', error instanceof Error ? error.message : 'Unknown error');
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: [string, unknown][], options?: CacheOptions): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of keyValuePairs) {
        const cacheKey = this.generateKey(key);
        const serializedValue = JSON.stringify(value);
        
        if (options?.ttl) {
          pipeline.setex(cacheKey, options.ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }

        // Sla dependencies op indien aanwezig
        if (options?.dependencies?.length) {
          const dependencyKey = `${cacheKey}:deps`;
          pipeline.del(dependencyKey);
          pipeline.sadd(dependencyKey, ...options.dependencies.map(d => d.key));
        }

        // Sla tags op indien aanwezig
        if (options?.tags?.length) {
          const tagKeys = options.tags.map(tag => `tag:${tag}`);
          for (const tagKey of tagKeys) {
            pipeline.sadd(tagKey, cacheKey);
          }
        }
      }

      await pipeline.exec();
      await this.updateStats(true);
    } catch (error) {
      this.logger.error('Cache mset error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.getKeysByPattern(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error('Cache deletePattern error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      const searchPattern = this.generateKey(pattern);
      return await this.redis.keys(searchPattern);
    } catch (error) {
      this.logger.error('Cache getKeysByPattern error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  async getStats(): Promise<CacheStats> {
    return this.stats;
  }

  getLegacyStats() {
    return defaultStatsConverter(this.stats);
  }
}