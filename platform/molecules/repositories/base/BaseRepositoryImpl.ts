import { Injectable, Inject } from '@nestjs/common';
import { Connection, EntityTarget, Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BaseEntity } from '../../../atoms/entities/base.entity';
import { IBaseRepository } from '../../../atoms/interfaces/repository/IBaseRepository';
import { FindOptions } from '../../../atoms/interfaces/repository/types';
import { ICacheProvider } from '../../../core/cache/ICacheProvider';
import { RepositoryError } from '../../../atoms/errors/repository.error';

@Injectable()
export class BaseRepositoryImpl<T extends BaseEntity> implements IBaseRepository<T> {
  protected repository: Repository<T>;

  constructor(
    @InjectConnection() protected readonly connection: Connection,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: ICacheProvider,
    protected readonly entity: EntityTarget<T>,
  ) {
    this.repository = connection.getRepository(entity);
  }

  protected getCacheKey(id: string): string {
    const entityName = typeof this.entity === 'function' ? this.entity.name : this.entity;
    return `${entityName}:${id}`;
  }

  async findById(id: string): Promise<T | null> {
    try {
      // Check cache first
      const cached = await this.cacheManager.get<T>(this.getCacheKey(id));
      if (cached) {
        return cached;
      }

      // If not in cache, get from database
      const entity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
      });

      if (entity) {
        // Cache the result
        await this.cacheManager.set(this.getCacheKey(id), entity);
      }

      return entity;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error finding entity by id: ${error.message}`,
          'FIND_BY_ID_ERROR',
        );
      }
      throw error;
    }
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('entity');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
        });
      }

      if (options?.orderBy) {
        Object.entries(options.orderBy).forEach(([key, order]) => {
          queryBuilder.addOrderBy(`entity.${key}`, order);
        });
      }

      if (options?.offset) {
        queryBuilder.skip(options.offset);
      }

      if (options?.limit) {
        queryBuilder.take(options.limit);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(`Error finding entities: ${error.message}`, 'FIND_ALL_ERROR');
      }
      throw error;
    }
  }

  async create(entityData: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(entityData as DeepPartial<T>);
      const saved = await this.repository.save(entity);

      if ('id' in saved) {
        // Cache the new entity
        await this.cacheManager.set(this.getCacheKey(saved.id as string), saved);
      }

      return saved as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(`Error creating entity: ${error.message}`, 'CREATE_ERROR');
      }
      throw error;
    }
  }

  async update(id: string, entityData: Partial<T>): Promise<T> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError(`Entity with id ${id} not found`, 'ENTITY_NOT_FOUND');
      }

      const updated = await this.repository.save({
        ...existing,
        ...entityData,
        id,
      });

      // Update cache
      await this.cacheManager.set(this.getCacheKey(id), updated);

      return updated;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(`Error updating entity: ${error.message}`, 'UPDATE_ERROR');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.repository.delete(id);

      if (result.affected === 0) {
        throw new RepositoryError(`Entity with id ${id} not found`, 'ENTITY_NOT_FOUND');
      }

      // Invalidate cache
      await this.cacheManager.invalidate(this.getCacheKey(id));
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(`Error deleting entity: ${error.message}`, 'DELETE_ERROR');
      }
      throw error;
    }
  }

  async transaction<R>(operation: (repo: this) => Promise<R>): Promise<R> {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create a new repository instance for the transaction
      // Creëer een nieuwe repository instance met de transaction connection
      const transactionRepo = new BaseRepositoryImpl(
        queryRunner.manager.connection,
        this.cacheManager,
        this.entity,
      );

      // Bind de transaction aan de repository methods
      const result = await operation(transactionRepo as this);
      await queryRunner.commitTransaction();

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof Error) {
        throw new RepositoryError(`Transaction failed: ${error.message}`, 'TRANSACTION_ERROR');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
