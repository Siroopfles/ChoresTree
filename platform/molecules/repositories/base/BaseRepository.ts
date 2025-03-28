import { Connection, EntityTarget, Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { Inject } from '@nestjs/common';
import { BaseEntity } from '../../../atoms/entities/base.entity';
import { IBaseRepository } from '../../../atoms/interfaces/repository/IBaseRepository';
import { FindOptions } from '../../../atoms/interfaces/repository/types';
import { ICacheProvider } from '../../../core/cache/ICacheProvider';
import {
  generateEntityCacheKey,
  generateCollectionCacheKey,
} from '../../../core/cache/cache.utils';

export class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected repository: Repository<T>;
  protected entityName: string;

  constructor(
    protected connection: Connection,
    protected readonly entity: EntityTarget<T>,
    @Inject('CACHE_PROVIDER') protected cacheProvider: ICacheProvider,
  ) {
    this.repository = connection.getRepository(entity);
    this.entityName = this.repository.metadata.targetName;
  }

  async findById(id: string): Promise<T | null> {
    const cacheKey = generateEntityCacheKey(this.entityName, id);

    // Probeer eerst uit cache
    const cached = await this.cacheProvider.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Als niet in cache, haal op uit database
    const where: FindOptionsWhere<T> = {
      id: id as any,
    };

    const entity = await this.repository.findOne({ where });

    // Cache het resultaat als het bestaat
    if (entity) {
      await this.cacheProvider.set(cacheKey, entity);
    }

    return entity;
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    const cacheKey = generateCollectionCacheKey(this.entityName, options);

    // Probeer eerst uit cache
    const cached = await this.cacheProvider.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Als niet in cache, haal op uit database
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

    const entities = await queryBuilder.getMany();

    // Cache het resultaat
    await this.cacheProvider.set(cacheKey, entities);

    return entities;
  }

  async create(entity: Partial<T>): Promise<T> {
    const entityToCreate = this.repository.create(entity as DeepPartial<T>);
    const created = await this.repository.save(entityToCreate);

    // Cache het nieuwe entity
    const cacheKey = generateEntityCacheKey(this.entityName, created.id);
    await this.cacheProvider.set(cacheKey, created);

    // Invalideer collection cache
    await this.cacheProvider.invalidate(generateCollectionCacheKey(this.entityName));

    return created;
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    await this.repository.update(id, entity as any);

    const where: FindOptionsWhere<T> = {
      id: id as any,
    };

    const updated = await this.repository.findOne({ where });
    if (!updated) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Update cache
    const cacheKey = generateEntityCacheKey(this.entityName, id);
    await this.cacheProvider.set(cacheKey, updated);

    // Invalideer collection cache
    await this.cacheProvider.invalidate(generateCollectionCacheKey(this.entityName));

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);

    // Invalideer entity cache
    const cacheKey = generateEntityCacheKey(this.entityName, id);
    await this.cacheProvider.invalidate(cacheKey);

    // Invalideer collection cache
    await this.cacheProvider.invalidate(generateCollectionCacheKey(this.entityName));
  }

  async transaction<R>(operation: (repo: this) => Promise<R>): Promise<R> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(this);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
