import { Repository, FindOptionsWhere, DeepPartial, FindOneOptions, QueryRunner, SelectQueryBuilder, EntityTarget } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Logger } from '../../../utils/logger';

/**
 * Generic type for repository operations
 */
export type QueryOptions<T> = FindOneOptions<T>;
export type WhereCondition<T> = FindOptionsWhere<T>;

/**
 * Base repository implementing common CRUD operations and utilities
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
    protected readonly entityTarget: EntityTarget<T>
  ) {
    this.logger = new Logger(`${entityName}Repository`);
  }

  /**
   * Create a new entity instance
   */
  async create(data: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.save(entity, queryRunner);
    } catch (error) {
      this.logger.error('Failed to create entity:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Save an entity instance
   */
  async save(entity: T, queryRunner?: QueryRunner): Promise<T> {
    try {
      const repo = queryRunner?.manager.getRepository(this.entityTarget) ?? this.repository;
      return await repo.save(entity);
    } catch (error) {
      this.logger.error('Failed to save entity:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options?: QueryOptions<T>): Promise<T | null> {
    try {
      return await this.repository.findOne({
        ...options,
        where: { id } as WhereCondition<T>
      });
    } catch (error) {
      this.logger.error('Failed to find entity by ID:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Find entities by criteria
   */
  async find(where: WhereCondition<T>, options?: QueryOptions<T>): Promise<T[]> {
    try {
      return await this.repository.find({
        ...options,
        where
      });
    } catch (error) {
      this.logger.error('Failed to find entities:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T | null> {
    try {
      const entity = await this.findById(id);
      if (!entity) {
        return null;
      }

      Object.assign(entity, data);
      return await this.save(entity, queryRunner);
    } catch (error) {
      this.logger.error('Failed to update entity:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Soft delete entity by ID
   */
  async softDelete(id: string, queryRunner?: QueryRunner): Promise<boolean> {
    try {
      const repo = queryRunner?.manager.getRepository(this.entityTarget) ?? this.repository;
      const result = await repo.softDelete({ id } as FindOptionsWhere<T>);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      this.logger.error('Failed to soft delete entity:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Hard delete entity by ID
   */
  async hardDelete(id: string, queryRunner?: QueryRunner): Promise<boolean> {
    try {
      const repo = queryRunner?.manager.getRepository(this.entityTarget) ?? this.repository;
      const result = await repo.delete({ id } as FindOptionsWhere<T>);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      this.logger.error('Failed to hard delete entity:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Count entities matching criteria
   */
  async count(where: WhereCondition<T>): Promise<number> {
    try {
      return await this.repository.count({ where });
    } catch (error) {
      this.logger.error('Failed to count entities:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Create a new query builder instance
   */
  protected createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<R>(
    operation: (queryRunner: QueryRunner) => Promise<R>
  ): Promise<R> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clear cache for this repository
   */
  async clearCache(): Promise<void> {
    try {
      await this.repository.manager.connection.queryResultCache?.clear();
    } catch (error) {
      this.logger.error('Failed to clear cache:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}