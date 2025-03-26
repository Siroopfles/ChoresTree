import { Redis } from 'ioredis';
import { Logger } from '../../utils/logger';
import type { CacheProvider } from './providers/CacheProvider';
import { RedisCacheProvider } from './providers/RedisCacheProvider';
import { MemoryCacheProvider } from './providers/MemoryCacheProvider';

export interface CacheModuleOptions {
  provider: 'redis' | 'memory';
  redis?: Redis;
  ttl?: number;
  prefix?: string;
  maxMemory?: number;
  monitoringEnabled?: boolean;
}

/**
 * Core Cache Module for managing caching strategies and providers
 */
export class CacheModule {
  private readonly logger: Logger;
  private readonly provider: CacheProvider;
  private readonly options: CacheModuleOptions;

  constructor(options: CacheModuleOptions) {
    this.logger = new Logger('CacheModule');
    this.options = options;
    this.provider = this.initializeProvider();
  }

  /**
   * Initialize the appropriate cache provider
   */
  private initializeProvider(): CacheProvider {
    try {
      switch (this.options.provider) {
        case 'redis':
          if (!this.options.redis) {
            throw new Error('Redis instance is required for redis provider');
          }
          return new RedisCacheProvider(this.options.redis, {
            ttl: this.options.ttl,
            prefix: this.options.prefix,
            maxMemory: this.options.maxMemory,
            monitoringEnabled: this.options.monitoringEnabled,
          });
        case 'memory':
          return new MemoryCacheProvider({
            ttl: this.options.ttl,
            prefix: this.options.prefix,
            maxMemory: this.options.maxMemory,
            monitoringEnabled: this.options.monitoringEnabled,
          });
        default:
          throw new Error(`Unsupported cache provider: ${this.options.provider}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize cache provider:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get the configured cache provider
   */
  getProvider(): CacheProvider {
    return this.provider;
  }

  /**
   * Get cache stats for monitoring
   */
  async getStats(): Promise<{
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    totalOperations: number;
  }> {
    return this.provider.getStats();
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    await this.provider.clear();
  }
}