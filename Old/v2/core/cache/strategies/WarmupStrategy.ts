import { CacheProvider } from '../providers/CacheProvider';
import { EventBus } from '../../events/EventBus';

import { CacheOptions } from '../providers/CacheProvider';

interface WarmupItem<T = unknown> {
  key: string;
  value: T;
  options?: CacheOptions;
  priority?: number;
}

interface WarmupOptions {
  batchSize?: number;
  concurrentBatches?: number;
  priorityLevels?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Strategie voor het efficiënt vooraf laden van cache data
 */
export class WarmupStrategy {
  private readonly provider: CacheProvider;
  private readonly eventBus?: EventBus;
  private readonly options: Required<WarmupOptions>;
  private isWarmingUp: boolean = false;

  constructor(
    provider: CacheProvider,
    eventBus?: EventBus,
    options: WarmupOptions = {}
  ) {
    this.provider = provider;
    this.eventBus = eventBus;
    this.options = {
      batchSize: options.batchSize ?? 100,
      concurrentBatches: options.concurrentBatches ?? 3,
      priorityLevels: options.priorityLevels ?? 3,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 1000
    };
  }

  /**
   * Start het warmup proces met gegeven data
   */
  public async warmup<T>(items: WarmupItem<T>[]): Promise<void> {
    if (this.isWarmingUp) {
      throw new Error('Warmup process already in progress');
    }

    try {
      this.isWarmingUp = true;
      await this.publishEvent('cache.warmup.start', { itemCount: items.length });

      // Sorteer items op prioriteit
      const sortedItems = this.sortByPriority(items);
      const batches = this.createBatches(sortedItems);

      let successCount = 0;
      let failureCount = 0;

      // Process batches met concurrent limiet
      for (let i = 0; i < batches.length; i += this.options.concurrentBatches) {
        const currentBatches = batches.slice(i, i + this.options.concurrentBatches);
        const results = await Promise.all(
          currentBatches.map(batch => this.processBatch(batch))
        );

        // Verzamel statistieken
        for (const result of results) {
          successCount += result.success;
          failureCount += result.failure;
        }

        // Publiceer voortgang
        await this.publishEvent('cache.warmup.progress', {
          completed: Math.min((i + this.options.concurrentBatches) * this.options.batchSize, items.length),
          total: items.length,
          success: successCount,
          failure: failureCount
        });
      }

      await this.publishEvent('cache.warmup.complete', {
        total: items.length,
        success: successCount,
        failure: failureCount
      });

    } catch (error) {
      await this.publishEvent('cache.warmup.error', { error });
      throw error;
    } finally {
      this.isWarmingUp = false;
    }
  }

  /**
   * Verwerk een batch met retry logica
   */
  private async processBatch<T>(batch: WarmupItem<T>[]): Promise<{ success: number; failure: number }> {
    let success = 0;
    let failure = 0;

    for (const item of batch) {
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts < this.options.retryAttempts) {
        try {
          await this.provider.set(item.key, item.value, item.options);
          success++;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          attempts++;
          if (attempts < this.options.retryAttempts) {
            await this.delay(this.options.retryDelay * attempts); // Exponential backoff
          }
        }
      }

      if (attempts === this.options.retryAttempts) {
        failure++;
        console.error(`Failed to warm up key ${item.key} after ${attempts} attempts:`, lastError);
      }
    }

    return { success, failure };
  }

  /**
   * Sorteer items op prioriteit (1 = hoogste, options.priorityLevels = laagste)
   */
  private sortByPriority<T>(items: WarmupItem<T>[]): WarmupItem<T>[] {
    return [...items].sort((a, b) => {
      const priorityA = a.priority ?? this.options.priorityLevels;
      const priorityB = b.priority ?? this.options.priorityLevels;
      return priorityA - priorityB;
    });
  }

  /**
   * Verdeel items in batches voor efficiënte verwerking
   */
  private createBatches<T>(items: WarmupItem<T>[]): WarmupItem<T>[][] {
    const batches: WarmupItem<T>[][] = [];
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      batches.push(items.slice(i, i + this.options.batchSize));
    }
    return batches;
  }

  /**
   * Helper voor async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Publiceer events via de event bus
   */
  private async publishEvent(type: string, payload: unknown): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.publish({ type, payload });
      } catch (error) {
        console.error('Failed to publish warmup event:', error);
      }
    }
  }
}