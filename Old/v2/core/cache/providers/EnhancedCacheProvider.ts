import { Redis } from 'ioredis';
import { EventBus } from '../../events/EventBus';
import {
  CacheProvider,
  CacheProviderOptions,
  CacheStats,
  CacheOptions,
  CacheDependency,
  defaultStatsConverter
} from './CacheProvider';

interface CacheEntry<T> {
  value: T;
  dependencies: CacheDependency[];
  tags?: string[];
  lastAccessed: number;
  accessCount: number;
}

interface EnhancedCacheOptions extends CacheProviderOptions {
  eventBus?: EventBus;
  maxCascadeDepth?: number;
  warmupBatchSize?: number;
}

/**
 * Enhanced cache provider met geavanceerde features zoals cascade invalidatie,
 * warmup support en event integratie
 */
export class EnhancedCacheProvider implements CacheProvider {
  private readonly redis: Redis;
  private readonly eventBus?: EventBus;
  private readonly options: EnhancedCacheOptions;
  private readonly stats: CacheStats;
  private readonly dependencyMap: Map<string, Set<string>>;

  constructor(redis: Redis, options: EnhancedCacheOptions) {
    this.redis = redis;
    this.eventBus = options.eventBus;
    this.options = {
      ttl: options.ttl ?? 3600,
      prefix: options.prefix ?? 'cache:',
      maxMemory: options.maxMemory,
      monitoringEnabled: options.monitoringEnabled ?? true,
      maxCascadeDepth: options.maxCascadeDepth ?? 3,
      warmupBatchSize: options.warmupBatchSize ?? 100
    };
    this.stats = {
      hits: 0,
      misses: 0,
      memoryUsed: 0,
      operations: 0,
      lastReset: new Date()
    };
    this.dependencyMap = new Map();
  }

  /**
   * Haal waarde op uit cache met dependency tracking
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getFullKey(key));
      
      if (data) {
        const entry: CacheEntry<T> = JSON.parse(data);
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        
        // Update entry met nieuwe metadata
        await this.redis.set(
          this.getFullKey(key),
          JSON.stringify(entry),
          'KEEPTTL'
        );

        this.updateStats(true);
        return entry.value;
      }

      this.updateStats(false);
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Sla waarde op in cache met optionele dependencies
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      dependencies: options?.dependencies ?? [],
      tags: options?.tags,
      lastAccessed: Date.now(),
      accessCount: 0
    };

    try {
      const fullKey = this.getFullKey(key);
      const finalTTL = options?.ttl ?? this.options.ttl;
      if (finalTTL) {
        await this.redis.setex(fullKey, finalTTL, JSON.stringify(entry));
      } else {
        await this.redis.set(fullKey, JSON.stringify(entry));
      }

      // Update dependency tracking
      if (options?.dependencies) {
        for (const dep of options.dependencies) {
          this.trackDependency(dep.key, key);
        }
      }

      // Sla tags op indien aanwezig
      if (options?.tags?.length) {
        const pipeline = this.redis.pipeline();
        const tagKeys = options.tags.map(tag => `tag:${tag}`);
        for (const tagKey of tagKeys) {
          pipeline.sadd(tagKey, fullKey);
        }
        await pipeline.exec();
      }

      // Publish cache update event
      await this.publishEvent('cache.update', {
        key,
        dependencies: options?.dependencies,
        tags: options?.tags
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Verwijder cache entry en zijn dependencies
   */
  async delete(key: string, depth: number = 0): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      
      // Verwijder dependencies recursief
      if (depth < this.options.maxCascadeDepth!) {
        const dependentKeys = this.dependencyMap.get(key);
        if (dependentKeys) {
          for (const depKey of dependentKeys) {
            await this.delete(depKey, depth + 1);
          }
        }
      }

      // Verwijder de entry zelf
      await this.redis.del(fullKey);
      
      // Publish invalidatie event
      await this.publishEvent('cache.invalidate', { key });
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Pattern-based cache entry verwijdering
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.getFullKey(pattern));
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.publishEvent('cache.invalidate.pattern', { pattern });
      }
    } catch (error) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Warmup cache met frequent gebruikte data
   */
  async warmup(factory: () => Promise<Map<string, unknown>>): Promise<void> {
    try {
      const data = await factory();
      const entries = Array.from(data.entries());
      
      // Batch processing
      for (let i = 0; i < entries.length; i += this.options.warmupBatchSize!) {
        const batch = entries.slice(i, i + this.options.warmupBatchSize!);
        const pipeline = this.redis.pipeline();
        
        for (const [key, value] of batch) {
          const entry: CacheEntry<unknown> = {
            value,
            dependencies: [],
            lastAccessed: Date.now(),
            accessCount: 0
          };
          
          if (this.options.ttl) {
            pipeline.setex(this.getFullKey(key), this.options.ttl, JSON.stringify(entry));
          } else {
            pipeline.set(this.getFullKey(key), JSON.stringify(entry));
          }
        }
        
        await pipeline.exec();
      }

      await this.publishEvent('cache.warmup', { count: entries.length });
    } catch (error) {
      console.error('Cache warmup error:', error);
      throw error;
    }
  }

  // Implementatie van overige CacheProvider interface methoden...
  async clear(): Promise<void> {
    const keys = await this.redis.keys(this.getFullKey('*'));
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.dependencyMap.clear();
  }

  async getStats(): Promise<CacheStats> {
    return this.stats;
  }

  getLegacyStats() {
    return defaultStatsConverter(this.stats);
  }

  // Helper methods
  private getFullKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  private updateStats(hit: boolean): void {
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.stats.operations++;
  }

  private trackDependency(parentKey: string, childKey: string): void {
    if (!this.dependencyMap.has(parentKey)) {
      this.dependencyMap.set(parentKey, new Set());
    }
    this.dependencyMap.get(parentKey)!.add(childKey);
  }

  private async publishEvent(type: string, payload: unknown): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.publish({ type, payload });
      } catch (error) {
        console.error('Failed to publish cache event:', error);
      }
    }
  }

  // Implementatie van basis interface methoden
  async mget(keys: string[]): Promise<(unknown | null)[]> {
    const fullKeys = keys.map(key => this.getFullKey(key));
    const results = await this.redis.mget(...fullKeys);
    return results.map(result => result ? JSON.parse(result).value : null);
  }

  async mset(keyValuePairs: [string, unknown][], options?: CacheOptions): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const [key, value] of keyValuePairs) {
      const entry: CacheEntry<unknown> = {
        value,
        dependencies: options?.dependencies ?? [],
        tags: options?.tags,
        lastAccessed: Date.now(),
        accessCount: 0
      };

      const fullKey = this.getFullKey(key);
      const finalTTL = options?.ttl ?? this.options.ttl;
      
      if (finalTTL) {
        pipeline.setex(fullKey, finalTTL, JSON.stringify(entry));
      } else {
        pipeline.set(fullKey, JSON.stringify(entry));
      }

      // Track dependencies
      if (options?.dependencies) {
        for (const dep of options.dependencies) {
          this.trackDependency(dep.key, key);
        }
      }

      // Add tag associations
      if (options?.tags) {
        for (const tag of options.tags) {
          pipeline.sadd(`tag:${tag}`, fullKey);
        }
      }
    }
    
    await pipeline.exec();
  }

  // Dependency management
  async invalidateDependencies(key: string, maxDepth = this.options.maxCascadeDepth ?? 3): Promise<void> {
    await this.delete(key, maxDepth);
  }

  async getDependencies(key: string): Promise<CacheDependency[]> {
    const fullKey = this.getFullKey(key);
    const entry = await this.redis.get(fullKey);
    if (!entry) return [];

    try {
      const parsed = JSON.parse(entry) as CacheEntry<unknown>;
      return parsed.dependencies;
    } catch {
      return [];
    }
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

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const keys = await this.redis.keys(this.getFullKey(pattern));
    return keys.map(key => key.replace(this.options.prefix!, ''));
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
    const value = await this.get<T>(key);
    if (value !== null) return value;

    const newValue = await factory();
    await this.set(key, newValue, options);
    return newValue;
  }
}