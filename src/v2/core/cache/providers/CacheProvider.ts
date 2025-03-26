export interface CacheProvider {
  // Basic operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Write strategies
  writeThrough<T>(key: string, value: T, ttl?: number): Promise<void>;
  writeAround<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  // Cache-aside helpers
  getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T>;

  // Bulk operations
  mget(keys: string[]): Promise<(unknown | null)[]>;
  mset(keyValuePairs: [string, unknown][], ttl?: number): Promise<void>;

  // Pattern-based operations
  deletePattern(pattern: string): Promise<void>;
  getKeysByPattern(pattern: string): Promise<string[]>;

  // Monitoring
  getStats(): Promise<{
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    totalOperations: number;
  }>;
}

export interface CacheProviderOptions {
  ttl?: number;
  prefix?: string;
  maxMemory?: number;
  monitoringEnabled?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  memoryUsed: number;
  operations: number;
  lastReset: Date;
}