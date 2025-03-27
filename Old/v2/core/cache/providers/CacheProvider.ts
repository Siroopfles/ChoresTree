import { EventBus } from '../../events/EventBus';

export interface CacheStats {
  hits: number;
  misses: number;
  memoryUsed: number;
  operations: number;
  lastReset: Date;
}

export interface CacheDependency {
  key: string;
  pattern?: string;
  ttl?: number;
}

export interface CacheOptions {
  ttl?: number;
  dependencies?: CacheDependency[];
  tags?: string[];
}

export interface CacheProvider {
  // Basic operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Write strategies
  writeThrough<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  writeAround<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  // Cache-aside helpers
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;

  // Bulk operations
  mget(keys: string[]): Promise<(unknown | null)[]>;
  mset(keyValuePairs: [string, unknown][], options?: CacheOptions): Promise<void>;

  // Pattern-based operations
  deletePattern(pattern: string): Promise<void>;
  getKeysByPattern(pattern: string): Promise<string[]>;

  // Dependency operations
  invalidateDependencies(key: string, maxDepth?: number): Promise<void>;
  getDependencies(key: string): Promise<CacheDependency[]>;
  
  // Tag operations
  invalidateByTag(tag: string): Promise<void>;
  getKeysByTag(tag: string): Promise<string[]>;

  // Monitoring
  getStats(): Promise<CacheStats>;
}

export interface CacheProviderOptions {
  ttl?: number;
  prefix?: string;
  maxMemory?: number;
  monitoringEnabled?: boolean;
  maxDependencyDepth?: number;
  eventBus?: EventBus;
}

// Re-export voor backwards compatibiliteit
export interface CacheStatsLegacy {
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  totalOperations: number;
}

export type StatsConverter = (stats: CacheStats) => CacheStatsLegacy;

export const defaultStatsConverter: StatsConverter = (stats: CacheStats): CacheStatsLegacy => {
  const total = stats.hits + stats.misses;
  return {
    hitRate: total > 0 ? stats.hits / total : 0,
    missRate: total > 0 ? stats.misses / total : 0,
    memoryUsage: stats.memoryUsed,
    totalOperations: stats.operations
  };
};