import { Logger } from '../../../utils/logger';
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
  expiresAt?: number;
  dependencies?: CacheDependency[];
  tags?: string[];
  accessCount: number;
  lastAccessed: number;
}

export class MemoryCacheProvider implements CacheProvider {
  private readonly logger: Logger;
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private readonly tagMap: Map<string, Set<string>>;
  private stats: CacheStats;
  private memoryLimit: number;

  constructor(private readonly options: CacheProviderOptions = {}) {
    this.logger = new Logger('MemoryCacheProvider');
    this.cache = new Map();
    this.tagMap = new Map();
    this.stats = this.initializeStats();
    this.memoryLimit = options.maxMemory ?? 100 * 1024 * 1024; // Default 100MB
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

  private updateStats(hit: boolean): void {
    if (this.options.monitoringEnabled) {
      hit ? this.stats.hits++ : this.stats.misses++;
      this.stats.operations++;
      this.updateMemoryUsage();
    }
  }

  private updateMemoryUsage(): void {
    // Rough estimation of memory usage
    let total = 0;
    this.cache.forEach((entry, key) => {
      total += key.length * 2; // UTF-16 string
      total += JSON.stringify(entry.value).length * 2;
    });
    this.stats.memoryUsed = total;

    // Enforce memory limit
    if (total > this.memoryLimit) {
      this.enforceMemoryLimit();
    }
  }

  private enforceMemoryLimit(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));

    while (this.stats.memoryUsed > this.memoryLimit && entries.length > 0) {
      const [key] = entries.shift()!;
      this.cache.delete(key);
      this.updateMemoryUsage();
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key);
      const entry = this.cache.get(cacheKey) as CacheEntry<T> | undefined;

      if (!entry || this.isExpired(entry)) {
        this.updateStats(false);
        if (entry) {
          this.cache.delete(cacheKey);
        }
        return null;
      }

      this.updateStats(true);
      return entry.value;
    } catch (error) {
      this.logger.error('Cache get error:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      const entry: CacheEntry<T> = {
        value,
        expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : undefined,
        dependencies: options?.dependencies,
        tags: options?.tags,
        accessCount: 0,
        lastAccessed: Date.now()
      };

      // Verwijder bestaande tag associaties
      if (this.cache.has(cacheKey)) {
        const oldEntry = this.cache.get(cacheKey) as CacheEntry<T>;
        if (oldEntry.tags) {
          this.removeFromTags(cacheKey, oldEntry.tags);
        }
      }

      this.cache.set(cacheKey, entry);
      
      // Voeg nieuwe tag associaties toe
      if (options?.tags) {
        this.addToTags(cacheKey, options.tags);
      }

      this.updateStats(true);
    } catch (error) {
      this.logger.error('Cache set error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private removeFromTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      const tagSet = this.getTagSet(tag);
      tagSet.delete(key);
      if (tagSet.size === 0) {
        this.tagMap.delete(tag);
      }
    }
  }

  private addToTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      const tagSet = this.getTagSet(tag);
      tagSet.add(key);
    }
  }

  private getTagSet(tag: string): Set<string> {
    let tagSet = this.tagMap.get(tag);
    if (!tagSet) {
      tagSet = new Set<string>();
      this.tagMap.set(tag, tagSet);
    }
    return tagSet;
  }

  private clearTags(): void {
    this.tagMap.clear();
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.generateKey(key);
    this.cache.delete(cacheKey);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.clearTags();
    this.stats = this.initializeStats();
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

  async invalidateDependencies(key: string, maxDepth = this.options.maxDependencyDepth ?? 3): Promise<void> {
    const visited = new Set<string>();
    const queue = [this.generateKey(key)];
    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      const currentKey = queue.shift()!;
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      const entry = this.cache.get(currentKey);
      if (entry && entry.dependencies) {
        for (const dep of entry.dependencies) {
          const depKey = this.generateKey(dep.key);
          queue.push(depKey);
        }
      }

      this.cache.delete(currentKey);
      depth++;
    }
  }

  async getDependencies(key: string): Promise<CacheDependency[]> {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    return entry?.dependencies ?? [];
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagSet = this.getTagSet(tag);
    
    for (const key of tagSet) {
      this.cache.delete(key);
    }
    
    this.tagMap.delete(tag);
  }

  async getKeysByTag(tag: string): Promise<string[]> {
    const tagSet = this.getTagSet(tag);
    return Array.from(tagSet);
  }

  async mget(keys: string[]): Promise<(unknown | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValuePairs: [string, unknown][], options?: CacheOptions): Promise<void> {
    await Promise.all(
      keyValuePairs.map(([key, value]) => this.set(key, value, options))
    );
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.getKeysByPattern(pattern);
    keys.forEach(key => this.cache.delete(key));
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async getStats(): Promise<CacheStats> {
    return this.stats;
  }

  getLegacyStats() {
    return defaultStatsConverter(this.stats);
  }
}