import { CacheProvider } from '../providers/CacheProvider';

export interface CacheableOptions {
  ttl?: number;
  strategy?: 'cache-aside' | 'write-through' | 'write-around';
  keyPrefix?: string;
  invalidateOnMutation?: boolean;
  invalidatePattern?: string;
  condition?: (...args: unknown[]) => boolean;
}

/**
 * Generate a cache key based on method arguments and options
 */
function generateCacheKey(
  target: object | Function,
  propertyKey: string | symbol,
  args: unknown[],
  options: CacheableOptions
): string {
  const keyPrefix = options.keyPrefix ?? target.constructor.name;
  const argsString = JSON.stringify(args);
  return `${keyPrefix}:${String(propertyKey)}:${argsString}`;
}

/**
 * Advanced caching decorator with multiple strategies
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (
    target: object | Function,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { cacheProvider: CacheProvider }, ...args: unknown[]): Promise<unknown> {
      // Check if caching should be applied
      if (options.condition && !options.condition.apply(this, args)) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = generateCacheKey(target, propertyKey, args, options);
      const provider = this.cacheProvider;

      try {
        switch (options.strategy) {
          case 'write-through':
            const result = await originalMethod.apply(this, args);
            await provider.writeThrough(cacheKey, result, options.ttl);
            return result;

          case 'write-around':
            const aroundResult = await originalMethod.apply(this, args);
            await provider.writeAround(cacheKey, aroundResult);
            return aroundResult;

          case 'cache-aside':
          default:
            return provider.getOrSet(
              cacheKey,
              () => originalMethod.apply(this, args),
              options.ttl
            );
        }
      } catch {
        // Fall back to original method on cache error
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to invalidate cache entries on method execution
 */
export function InvalidateCache(pattern?: string) {
  return function (
    target: object | Function,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { cacheProvider: CacheProvider }, ...args: unknown[]): Promise<unknown> {
      const provider = this.cacheProvider;
      const result = await originalMethod.apply(this, args);

      try {
        if (pattern) {
          await provider.deletePattern(pattern);
        } else {
          const defaultPattern = `${target.constructor.name}:*`;
          await provider.deletePattern(defaultPattern);
        }
      } catch (error) {
        // Log error but don't fail the operation
        console.error('Cache invalidation failed:', error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to skip cache for specific conditions
 */
export function SkipCache(condition: (...args: unknown[]) => boolean) {
  return Cacheable({ condition: (...args) => !condition(...args) });
}

/**
 * Decorator to set custom TTL for cache entries
 */
export function CacheTTL(ttl: number) {
  return Cacheable({ ttl });
}