import {
  Connection,
  EntityTarget,
  Repository,
  FindOptionsWhere,
  DeepPartial,
  QueryRunner,
  FindOneOptions,
} from 'typeorm';
import { Inject, Logger } from '@nestjs/common';
import { BaseEntity } from '../../../atoms/entities/base.entity';
import { IBaseRepository } from '../../../atoms/interfaces/repository/IBaseRepository';
import { FindOptions } from '../../../atoms/interfaces/repository/types';
import { ICacheProvider } from '../../../core/cache/ICacheProvider';
import { DatabaseMetrics } from '../../../core/database/connection';
import {
  generateEntityCacheKey,
  generateCollectionCacheKey,
} from '../../../core/cache/cache.utils';

export class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected repository: Repository<T>;
  protected entityName: string;
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly metrics = DatabaseMetrics.getInstance();

  constructor(
    protected connection: Connection,
    protected readonly entity: EntityTarget<T>,
    @Inject('CACHE_PROVIDER') protected cacheProvider: ICacheProvider,
  ) {
    this.repository = connection.getRepository(entity);
    this.entityName = this.repository.metadata.targetName;

    // Configureer eager/lazy loading
    this.repository.metadata.relations.forEach((relation) => {
      if (!relation.isEager) {
        relation.isLazy = true;
      }
    });
  }

  async findById(id: string): Promise<T | null> {
    const cacheKey = generateEntityCacheKey(this.entityName, id);

    // Probeer eerst uit cache
    const cached = await this.cacheProvider.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    return await this.monitorQuery('findById', async () => {
      const options: FindOneOptions<T> = {
        where: { id: id as any },
        loadEagerRelations: false,
        cache: true,
      };

      const entity = await this.repository.findOne(options);

      // Cache het resultaat als het bestaat
      if (entity) {
        await this.cacheProvider.set(cacheKey, entity);
      }

      return entity;
    });
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    const cacheKey = generateCollectionCacheKey(this.entityName, options);

    // Probeer eerst uit cache
    const cached = await this.cacheProvider.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }

    return await this.monitorQuery('findAll', async () => {
      const queryBuilder = this.repository
        .createQueryBuilder('entity')
        // Voorkom N+1 queries door LEFT JOIN te gebruiken
        .leftJoinAndSelect('entity.relations', 'relations')
        .cache(true);

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
      await this.cacheProvider.set(cacheKey, entities);

      return entities;
    });
  }

  async create(entity: Partial<T>): Promise<T> {
    return await this.monitorQuery('create', async () => {
      const entityToCreate = this.repository.create(entity as DeepPartial<T>);
      const created = await this.repository.save(entityToCreate);

      // Cache het nieuwe entity
      const cacheKey = generateEntityCacheKey(this.entityName, created.id);
      await this.cacheProvider.set(cacheKey, created);

      // Invalideer collection cache
      await this.cacheProvider.invalidate(generateCollectionCacheKey(this.entityName));

      return created;
    });
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    return await this.monitorQuery('update', async () => {
      const updateResult = await this.repository.update({ id: id as any }, entity as any);

      const options: FindOneOptions<T> = {
        where: { id: id as any },
        cache: true,
      };

      const updated = await this.repository.findOne(options);
      if (!updated) {
        throw new Error(`Entity with id ${id} not found`);
      }

      // Update cache
      const cacheKey = generateEntityCacheKey(this.entityName, id);
      await this.cacheProvider.set(cacheKey, updated);

      // Invalideer collection cache
      await this.cacheProvider.invalidate(generateCollectionCacheKey(this.entityName));

      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.monitorQuery('delete', async () => {
      await this.repository.delete(id);

      // Invalideer entity cache
      const cacheKey = generateEntityCacheKey(this.entityName, id);
      await this.cacheProvider.invalidate(cacheKey);

      // Invalideer collection cache
      await this.cacheProvider.invalidate(generateCollectionCacheKey(this.entityName));
    });
  }

  async transaction<R>(operation: (repo: this) => Promise<R>): Promise<R> {
    let queryRunner: QueryRunner | null = null;

    return await this.monitorQuery('transaction', async () => {
      try {
        queryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const result = await operation(this);
        await queryRunner.commitTransaction();

        return result;
      } catch (error) {
        if (queryRunner) {
          await queryRunner.rollbackTransaction();
        }
        throw error;
      } finally {
        if (queryRunner) {
          await queryRunner.release();
        }
      }
    });
  }

  protected async monitorQuery<R>(queryName: string, operation: () => Promise<R>): Promise<R> {
    const startTime = process.hrtime();

    try {
      const result = await operation();

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1e9 + duration[1]) / 1e6;
      this.metrics.recordQueryExecution(queryName, durationMs);

      return result;
    } catch (error) {
      this.logger.error(
        `Query '${queryName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.metrics.recordError(
        queryName,
        error instanceof Error ? error : new Error('Unknown error'),
      );
      throw error;
    }
  }
}
