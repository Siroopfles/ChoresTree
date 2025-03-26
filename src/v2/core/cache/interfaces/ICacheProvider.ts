import { CacheStats } from '../providers/CacheProvider';

export interface CacheOptions {
  ttl?: number;
  dependencies?: CacheDependency[];
  tags?: string[];
}

export interface CacheDependency {
  key: string;
  pattern?: string;
  ttl?: number;
}

export interface ICacheProvider {
  // Core operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Pattern operations
  deletePattern(pattern: string): Promise<void>;
  getKeysByPattern(pattern: string): Promise<string[]>;

  // Batch operations
  mget(keys: string[]): Promise<(unknown | null)[]>;
  mset(keyValuePairs: [string, unknown][], ttl?: number): Promise<void>;

  // Advanced operations
  getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>;
  writeThrough<T>(key: string, value: T, ttl?: number): Promise<void>;
  writeAround<T>(key: string, value: T, ttl?: number): Promise<void>;

  // Monitoring
  getStats(): Promise<CacheStats>;
}

// Re-export types that were originally in CacheProvider
export { CacheStats } from '../providers/CacheProvider';