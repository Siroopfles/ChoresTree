import { Repository, FindOptionsWhere, FindOneOptions, DeepPartial } from 'typeorm';
import { Redis } from 'ioredis';
import { redisClient } from '@/config/database';
import { IBaseEntity, IServerScoped } from '@/atomic/atoms/database/interfaces/BaseEntity';
export abstract class BaseRepository<T extends IBaseEntity> {
  protected readonly redisClient: Redis;

  protected constructor(
    protected repository: Repository<T>,
    protected cacheKeyPrefix: string,
    protected cacheTTL: number = 300, // 5 minuten default TTL
  ) {
    this.redisClient = redisClient;
  }

  protected abstract getCacheKey(id: string): string;

  // Cache management
  protected async setCache(key: string, data: T | null): Promise<void> {
    await redisClient.set(key, JSON.stringify(data), 'EX', this.cacheTTL);
  }

  protected async getCache(key: string): Promise<T | null> {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  protected async clearCache(key: string): Promise<void> {
    await redisClient.del(key);
  }

  // CRUD Operations met caching
  async findById(id: string): Promise<T | null> {
    // Check cache first
    const cacheKey = this.getCacheKey(id);
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Query database if not in cache
    const entity = await this.repository.findOneBy({ id } as FindOptionsWhere<T>);
    await this.setCache(cacheKey, entity);
    return entity;
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    await this.repository.save(entity);
    const cacheKey = this.getCacheKey(entity.id);
    await this.setCache(cacheKey, entity);
    return entity;
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    // Gebruik merge en save voor type-safe updates
    let entity = await this.repository.findOneBy({ id } as FindOptionsWhere<T>);
    if (entity) {
      entity = this.repository.merge(entity, data);
      entity = await this.repository.save(entity);
      const cacheKey = this.getCacheKey(id);
      await this.setCache(cacheKey, entity);
    }
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    const cacheKey = this.getCacheKey(id);
    await this.clearCache(cacheKey);
    return result.affected === 1;
  }
}

// Extended base repository voor server-scoped entities
export abstract class ServerScopedRepository<T extends IBaseEntity & IServerScoped> extends BaseRepository<T> {
  // Vindt entities voor een specifieke server
  async findByServerId(
    serverId: string,
    options?: FindOneOptions<T>
  ): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: {
        ...options?.where,
        serverId,
      } as FindOptionsWhere<T>,
    });
  }

  // Genereert cache key met server ID voor betere partitioning
  protected getCacheKey(id: string): string {
    return `${this.cacheKeyPrefix}:${id}`;
  }

  protected getServerCacheKey(serverId: string): string {
    return `${this.cacheKeyPrefix}:server:${serverId}`;
  }

  // Cache invalidation voor server-scoped data
  protected async clearServerCache(serverId: string): Promise<void> {
    const cacheKey = this.getServerCacheKey(serverId);
    await this.clearCache(cacheKey);
  }
}
