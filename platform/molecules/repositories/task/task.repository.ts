import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, FindOptionsWhere } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ICacheProvider } from '../../../core/cache/ICacheProvider';
import { EncryptedRepositoryImpl } from '../base/EncryptedRepositoryImpl';
import { TaskEntity, TaskStatus } from '../../../atoms/entities/task.entity';
import { FindOptions } from '../../../atoms/interfaces/repository/types';

@Injectable()
export class TaskRepository extends EncryptedRepositoryImpl<TaskEntity> {
  constructor(
    @InjectConnection() connection: Connection,
    @Inject(CACHE_MANAGER) cacheManager: ICacheProvider,
  ) {
    super(connection, cacheManager, TaskEntity);
    // Configureer encryptie voor gevoelige velden
    this.encryptField('metadata');
  }

  /**
   * Zoekt actieve taken
   * Gebruikt hot cache (5 min) voor optimale performance
   */
  async findActive(options?: FindOptions): Promise<TaskEntity[]> {
    const cacheKey = this.getCacheKeyForQuery('active', options);
    const cached = await this.cacheManager.get<TaskEntity[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: FindOptionsWhere<TaskEntity> = {
      status: TaskStatus.IN_PROGRESS,
    };
    const tasks = await this.repository.find({
      where,
      ...options,
    });

    await this.cacheManager.set(cacheKey, tasks, 300); // 5 minuten voor actieve taken

    return tasks;
  }

  /**
   * Zoekt taken voor een specifieke assignee
   * Gebruikt warm cache (30 min) voor voltooide taken
   */
  async findByAssignee(assigneeId: string, options?: FindOptions): Promise<TaskEntity[]> {
    const cacheKey = this.getCacheKeyForQuery(`assignee:${assigneeId}`, options);
    const cached = await this.cacheManager.get<TaskEntity[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const tasks = await this.repository.find({
      where: { assigneeId },
      ...options,
    });

    const ttl = tasks.every((task) => task.status === TaskStatus.COMPLETED) ? 1800 : 300; // 30 min voor voltooide, 5 min voor actieve
    await this.cacheManager.set(cacheKey, tasks, ttl);

    return tasks;
  }

  /**
   * Bulk update voor task status
   * Invalideert gerelateerde caches
   */
  async bulkUpdateStatus(taskIds: string[], completed: boolean): Promise<void> {
    const newStatus = completed ? 'COMPLETED' : 'IN_PROGRESS';

    await this.transaction(async (repo) => {
      await repo.repository
        .createQueryBuilder()
        .update(TaskEntity)
        .set({ status: () => `'${newStatus}'` })
        .where('id IN (:...taskIds)', { taskIds })
        .execute();
    });

    // Invalideer relevante cache keys
    const activeCacheKey = this.getCacheKeyForQuery('active');
    const assigneeCacheKey = this.getCacheKeyForQuery(`assignee:${taskIds[0]}`); // Voorbeeld voor eerste task
    await this.cacheManager.invalidate(activeCacheKey);
    await this.cacheManager.invalidate(assigneeCacheKey);
  }

  /**
   * Override getCacheKey voor task-specifieke cache configuratie
   */
  protected getCacheKeyForQuery(type: string, options?: FindOptions): string {
    const baseKey = `tasks:${type}`;
    if (!options) return baseKey;

    const optionsKey = JSON.stringify(options);
    return `${baseKey}:${optionsKey}`;
  }

  /**
   * Prefetch taken voor optimale performance
   */
  async prefetchForAssignee(assigneeId: string): Promise<void> {
    const tasks = await this.repository.find({
      where: { assigneeId, status: TaskStatus.IN_PROGRESS },
    });

    const cacheKey = this.getCacheKeyForQuery(`assignee:${assigneeId}`);
    await this.cacheManager.set(cacheKey, tasks, 300); // 5 minuten cache
  }
}
