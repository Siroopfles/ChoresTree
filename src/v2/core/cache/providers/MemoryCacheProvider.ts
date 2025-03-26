import { Logger } from '../../../utils/logger';
import { CacheProvider, CacheProviderOptions, CacheStats } from './CacheProvider';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export class MemoryCacheProvider implements CacheProvider {
  private readonly logger: Logger;
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private stats: CacheStats;
  private memoryLimit: number;

  constructor(private readonly options: CacheProviderOptions = {}) {
    this.logger = new Logger('MemoryCacheProvider');
    this.cache = new Map();
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

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttl ? Date.now() + ttl * 1000 : undefined
      };

      this.cache.set(cacheKey, entry);
      this.updateStats(true);
    } catch (error) {
      this.logger.error('Cache set error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.generateKey(key);
    this.cache.delete(cacheKey);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = this.initializeStats();
  }

  async writeThrough<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, value, ttl);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async writeAround<T>(_key: string, _value: T): Promise<void> {
    // Intentionally skip cache
    return;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async mget(keys: string[]): Promise<(unknown | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValuePairs: [string, unknown][], ttl?: number): Promise<void> {
    await Promise.all(
      keyValuePairs.map(([key, value]) => this.set(key, value, ttl))
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

  async getStats(): Promise<{
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    totalOperations: number;
  }> {
    const total = this.stats.hits + this.stats.misses;
    return {
      hitRate: total > 0 ? this.stats.hits / total : 0,
      missRate: total > 0 ? this.stats.misses / total : 0,
      memoryUsage: this.stats.memoryUsed,
      totalOperations: this.stats.operations
    };
  }
}