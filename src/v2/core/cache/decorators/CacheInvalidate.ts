import { EventBus } from '../../events/EventBus';
import { CacheProvider } from '../providers/CacheProvider';
import { CascadeStrategy } from '../strategies/CascadeStrategy';

interface InvalidationOptions {
  key?: string;
  pattern?: string;
  cascade?: boolean;
  maxDepth?: number;
  eventTypes?: string[];
}

/**
 * Helper functie om cache key te genereren
 */
function generateCacheKey(
  target: object | Function,
  propertyKey: string | symbol,
  args: unknown[],
  keyTemplate?: string
): string {
  if (keyTemplate) {
    // Replace placeholders in template (e.g., {0}, {1}) with argument values
    return keyTemplate.replace(/\{(\d+)\}/g, (_, index) => {
      const value = args[parseInt(index)];
      return value !== null && value !== undefined ? String(value) : '';
    });
  }

  const keyPrefix = target.constructor.name;
  const argsString = JSON.stringify(args);
  return `${keyPrefix}:${String(propertyKey)}:${argsString}`;
}

/**
 * Decorator voor het automatisch invalideren van cache entries
 * gebaseerd op method execution of events
 */
export function CacheInvalidate(options: InvalidationOptions = {}) {
  return function (
    target: object | Function,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: {
      eventBus?: EventBus;
      cacheProvider?: CacheProvider;
      cascadeStrategy?: CascadeStrategy;
    }, ...args: unknown[]): Promise<unknown> {
      // Voer de originele methode eerst uit
      const result = await originalMethod.apply(this, args);

      if (!this.cacheProvider) {
        console.warn('CacheInvalidate: No cache provider found');
        return result;
      }

      try {
        // Invalideer op basis van key/pattern
        if (options.key) {
          const cacheKey = generateCacheKey(target, propertyKey, args, options.key);
          
          if (options.cascade) {
            await this.cacheProvider.invalidateDependencies(cacheKey, options.maxDepth);
          } else {
            await this.cacheProvider.delete(cacheKey);
          }
        }

        if (options.pattern) {
          await this.cacheProvider.deletePattern(options.pattern);
        }

        // Setup event listeners voor invalidatie
        if (options.eventTypes && this.eventBus) {
          for (const eventType of options.eventTypes) {
            this.eventBus.subscribe({
              eventType,
              handle: async (event: { type: string; payload?: unknown }) => {
                if (!this.cacheProvider) {
                  console.warn('CacheInvalidate: No cache provider found in event handler');
                  return;
                }

                try {
                  if (options.key) {
                    const cacheKey = generateCacheKey(target, propertyKey, [event]);
                    
                    if (options.cascade) {
                      await this.cacheProvider.invalidateDependencies(cacheKey, options.maxDepth);
                    } else {
                      await this.cacheProvider.delete(cacheKey);
                    }
                  }

                  if (options.pattern) {
                    await this.cacheProvider.deletePattern(options.pattern);
                  }
                } catch (error) {
                  console.error('Cache invalidation error in event handler:', error);
                }
              }
            });
          }
        }

      } catch (error) {
        // Log error maar laat de operatie doorgaan
        console.error('Cache invalidation error:', error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator voor het invalideren van cache entries op basis van patterns
 */
export function InvalidatePattern(pattern: string) {
  return CacheInvalidate({ pattern });
}

/**
 * Decorator voor het invalideren van cache entries met cascade
 */
export function InvalidateWithCascade(key: string, maxDepth?: number) {
  return CacheInvalidate({ key, cascade: true, maxDepth });
}

/**
 * Decorator voor event-gebaseerde cache invalidatie
 */
export function InvalidateOnEvents(eventTypes: string[], pattern?: string) {
  return CacheInvalidate({ eventTypes, pattern });
}

/**
 * Decorator voor het invalideren van gerelateerde cache entries
 */
export function InvalidateRelated(key: string, relatedPatterns: string[]) {
  return function (
    target: object | Function,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: { cacheProvider?: CacheProvider }, ...args: unknown[]): Promise<unknown> {
      const result = await originalMethod.apply(this, args);

      if (!this.cacheProvider) {
        console.warn('InvalidateRelated: No cache provider found');
        return result;
      }

      try {
        const cacheKey = generateCacheKey(target, propertyKey, args, key);
        await this.cacheProvider.delete(cacheKey);

        // Invalideer gerelateerde patterns
        for (const pattern of relatedPatterns) {
          await this.cacheProvider.deletePattern(pattern);
        }
      } catch (error) {
        console.error('Related cache invalidation error:', error);
      }

      return result;
    };

    return descriptor;
  };
}