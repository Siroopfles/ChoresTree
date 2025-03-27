import { CacheProvider } from '../providers/CacheProvider';
import { EventBus } from '../../events/EventBus';

interface CascadeOptions {
  maxDepth?: number;
  batchSize?: number;
  parallelInvalidation?: boolean;
}

/**
 * Strategie voor het beheren van cache dependencies en cascade invalidatie
 */
export class CascadeStrategy {
  private readonly provider: CacheProvider;
  private readonly eventBus?: EventBus;
  private readonly options: Required<CascadeOptions>;
  private readonly dependencyMap: Map<string, Set<string>>;

  constructor(
    provider: CacheProvider,
    eventBus?: EventBus,
    options: CascadeOptions = {}
  ) {
    this.provider = provider;
    this.eventBus = eventBus;
    this.options = {
      maxDepth: options.maxDepth ?? 3,
      batchSize: options.batchSize ?? 100,
      parallelInvalidation: options.parallelInvalidation ?? false
    };
    this.dependencyMap = new Map();
  }

  /**
   * Registreer een dependency tussen cache entries
   */
  public addDependency(parentKey: string, childKey: string): void {
    if (!this.dependencyMap.has(parentKey)) {
      this.dependencyMap.set(parentKey, new Set());
    }
    this.dependencyMap.get(parentKey)!.add(childKey);
  }

  /**
   * Registreer meerdere dependencies
   */
  public addDependencies(parentKey: string, childKeys: string[]): void {
    childKeys.forEach(childKey => this.addDependency(parentKey, childKey));
  }

  /**
   * Verwijder een dependency
   */
  public removeDependency(parentKey: string, childKey: string): void {
    const dependencies = this.dependencyMap.get(parentKey);
    if (dependencies) {
      dependencies.delete(childKey);
      if (dependencies.size === 0) {
        this.dependencyMap.delete(parentKey);
      }
    }
  }

  /**
   * Haal alle directe dependencies op voor een key
   */
  public getDependencies(key: string): string[] {
    return Array.from(this.dependencyMap.get(key) ?? []);
  }

  /**
   * Haal alle recursieve dependencies op tot maxDepth
   */
  public getAllDependencies(key: string, maxDepth: number = this.options.maxDepth): string[] {
    const visited = new Set<string>();
    const dependencies: string[] = [];

    const traverse = (currentKey: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentKey)) return;
      visited.add(currentKey);

      const deps = this.getDependencies(currentKey);
      for (const dep of deps) {
        dependencies.push(dep);
        traverse(dep, depth + 1);
      }
    };

    traverse(key, 0);
    return dependencies;
  }

  /**
   * Invalideer een cache entry en zijn dependencies
   */
  public async invalidate(key: string, depth: number = 0): Promise<void> {
    if (depth >= this.options.maxDepth) return;

    const dependencies = this.getDependencies(key);
    if (dependencies.length === 0) {
      await this.provider.delete(key);
      return;
    }

    if (this.options.parallelInvalidation) {
      // Parallel invalidatie voor betere performance
      const batches = this.createBatches(dependencies);
      for (const batch of batches) {
        await Promise.all(batch.map(dep => this.invalidate(dep, depth + 1)));
      }
    } else {
      // Sequentiële invalidatie voor betere consistentie
      for (const dep of dependencies) {
        await this.invalidate(dep, depth + 1);
      }
    }

    await this.provider.delete(key);
    await this.publishEvent('cache.invalidate.cascade', { key, dependencies });
  }

  /**
   * Helper method om dependencies in batches te verdelen
   */
  private createBatches(items: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      batches.push(items.slice(i, i + this.options.batchSize));
    }
    return batches;
  }

  /**
   * Publiceer events via de event bus
   */
  private async publishEvent(type: string, payload: unknown): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.publish({ type, payload });
      } catch (error) {
        console.error('Failed to publish cascade event:', error);
      }
    }
  }
}