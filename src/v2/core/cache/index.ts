// Import types
import { type CacheProvider } from './providers/CacheProvider';

// Core exports
export { CacheModule } from './CacheModule';
export {
  type CacheProvider,
  CacheProviderOptions,
  CacheStats,
  CacheOptions,
  CacheDependency,
  StatsConverter,
  CacheStatsLegacy,
  defaultStatsConverter
} from './providers/CacheProvider';

// Provider implementations
export { RedisCacheProvider } from './providers/RedisCacheProvider';
export { MemoryCacheProvider } from './providers/MemoryCacheProvider';
export { EnhancedCacheProvider } from './providers/EnhancedCacheProvider';

// Strategy exports
export { CascadeStrategy } from './strategies/CascadeStrategy';
export { WarmupStrategy } from './strategies/WarmupStrategy';

// Decorator exports
export {
  CacheInvalidate as InvalidateCache, // Backward compatibility
  CacheInvalidate,
  InvalidatePattern,
  InvalidateWithCascade,
  InvalidateOnEvents,
  InvalidateRelated
} from './decorators/CacheInvalidate';
export { 
  Cacheable,
  CacheTTL,
  SkipCache,
  CacheableOptions 
} from './decorators/Cacheable';

// Legacy interface export for backward compatibility
export type ICacheProvider = CacheProvider;
