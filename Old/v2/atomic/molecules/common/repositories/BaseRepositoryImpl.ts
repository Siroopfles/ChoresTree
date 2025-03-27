import { Repository, DeepPartial, QueryRunner, EntityTarget } from 'typeorm';
import { BaseEntity } from '@v2/core/database/base/BaseEntity';
import { BaseRepository, QueryOptions, WhereCondition } from '@v2/core/database/base/BaseRepository';
import { CacheProvider, Cacheable, InvalidateCache } from '@v2/core/cache';

/**
 * Implementation of BaseRepository with caching support
 */
export class BaseRepositoryImpl<T extends BaseEntity> extends BaseRepository<T> {
  protected readonly cacheProvider: CacheProvider;

  constructor(
    repository: Repository<T>,
    entityName: string,
    entityTarget: EntityTarget<T>,
    cacheProvider: CacheProvider
  ) {
    super(repository, entityName, entityTarget);
    this.cacheProvider = cacheProvider;
  }


  /**
   * Create a new entity instance with cache invalidation
   */
  @InvalidateCache()
  async create(data: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T> {
    return super.create(data, queryRunner);
  }

  /**
   * Find entity by ID with caching
   */
  @Cacheable({ strategy: 'cache-aside' })
  async findById(id: string, options?: QueryOptions<T>): Promise<T | null> {
    return super.findById(id, options);
  }

  /**
   * Find entities by criteria with caching
   */
  @Cacheable({ strategy: 'cache-aside' })
  async find(where: WhereCondition<T>, options?: QueryOptions<T>): Promise<T[]> {
    return super.find(where, options);
  }

  /**
   * Update entity by ID with cache invalidation
   */
  @InvalidateCache()
  async update(id: string, data: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T | null> {
    return super.update(id, data, queryRunner);
  }

  /**
   * Soft delete entity with cache invalidation
   */
  @InvalidateCache()
  async softDelete(id: string, queryRunner?: QueryRunner): Promise<boolean> {
    return super.softDelete(id, queryRunner);
  }

  /**
   * Hard delete entity with cache invalidation
   */
  @InvalidateCache()
  async hardDelete(id: string, queryRunner?: QueryRunner): Promise<boolean> {
    return super.hardDelete(id, queryRunner);
  }

  /**
   * Count entities with caching
   */
  @Cacheable({ strategy: 'cache-aside' })
  async count(where: WhereCondition<T>): Promise<number> {
    return super.count(where);
  }

  /**
   * Clear entity cache
   */
  async clearEntityCache(): Promise<void> {
    await this.cacheProvider.deletePattern(`${this.entityName}:*`);
  }
}
