import { Logger } from '../../utils/logger';
import { CacheModule } from '../cache/CacheModule';
import type { CacheMetrics as ICacheMetrics } from './interfaces/Metrics';

export class CacheMetricsCollector implements ICacheMetrics {
  private readonly logger: Logger;
  private readonly cacheModule: CacheModule;
  private metrics: {
    hits: number;
    misses: number;
    operations: number;
    evictions: number;
  };

  hitRate: number = 0;
  missRate: number = 0;
  memoryUsage: number = 0;
  evictionCount: number = 0;
  totalOperations: number = 0;

  constructor(cacheModule: CacheModule) {
    this.logger = new Logger('CacheMetrics');
    this.cacheModule = cacheModule;
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      evictions: 0
    };

    this.setupMetricsCollection();
  }

  private setupMetricsCollection(): void {
    // Gebruik de ingebouwde monitoring van de CacheModule
    if (!this.cacheModule.getProvider()) {
      throw new Error('Cache provider is not initialized');
    }

    // Start periodieke metrics verzameling
    this.collectMetrics();
  }

  private async collectMetrics(): Promise<void> {
    try {
      const stats = await this.cacheModule.getStats();
      
      // Update lokale metrics
      this.metrics.operations = stats.totalOperations;
      this.hitRate = stats.hitRate;
      this.missRate = stats.missRate;
      this.memoryUsage = stats.memoryUsage;

      // Bereken afgeleide metrics
      this.metrics.hits = Math.floor(stats.totalOperations * stats.hitRate);
      this.metrics.misses = Math.floor(stats.totalOperations * stats.missRate);
      this.totalOperations = stats.totalOperations;

      // Log significante veranderingen
      if (stats.memoryUsage > 400) { // 80% van 500MB limiet
        this.logger.warn(`High cache memory usage: ${Math.round(stats.memoryUsage)}MB`);
      }

      if (stats.missRate > 0.2) { // Miss rate hoger dan 20%
        this.logger.warn(`High cache miss rate: ${Math.round(stats.missRate * 100)}%`);
      }
    } catch (error) {
      this.logger.error('Failed to collect cache metrics', error);
    }
  }

  /**
   * Track cache eviction
   */
  trackEviction(): void {
    this.metrics.evictions++;
    this.evictionCount = this.metrics.evictions;
  }

  /**
   * Collect current cache metrics
   */
  async collect(): Promise<Record<string, number | string>> {
    await this.collectMetrics();

    return {
      hitRate: Math.round(this.hitRate * 100) / 100,
      missRate: Math.round(this.missRate * 100) / 100,
      memoryUsage: Math.round(this.memoryUsage),
      evictionCount: this.evictionCount,
      totalOperations: this.totalOperations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metric counters
   */
  async reset(): Promise<void> {
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      evictions: 0
    };
    this.hitRate = 0;
    this.missRate = 0;
    this.memoryUsage = 0;
    this.evictionCount = 0;
    this.totalOperations = 0;
  }
}