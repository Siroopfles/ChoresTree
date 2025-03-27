import { Between, LessThan, In, LessThanOrEqual, DeepPartial } from 'typeorm';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskPriority, TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { AppDataSource } from '@/config/database';
import { ServerScopedRepository } from './BaseRepository';

export class TaskRepository extends ServerScopedRepository<Task> {
  constructor() {
    super(AppDataSource.getRepository(Task), 'tasks', 600); // 10 minuten cache TTL voor taken
  }

  // Cache management voor arrays
  protected async setCacheArray(key: string, data: Task[]): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(data), 'EX', this.cacheTTL);
  }

  protected async getCacheArray(key: string): Promise<Task[] | null> {
    const cached = await this.redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Specifieke query methods met performance optimalisaties
  async findPendingTasks(serverId: string): Promise<Task[]> {
    const cacheKey = `${this.getServerCacheKey(serverId)}:pending`;
    const cached = await this.getCacheArray(cacheKey);
    if (cached) return cached;

    const tasks = await this.repository.find({
      where: {
        serverId,
        status: TaskStatus.PENDING,
      },
      order: {
        deadline: 'ASC',
      },
    });

    await this.setCacheArray(cacheKey, tasks);
    return tasks;
  }

  async findOverdueTasks(serverId: string): Promise<Task[]> {
    const conditions = {
      status: TaskStatus.PENDING,
      deadline: LessThan(new Date()),
    };

    // Als serverId niet '*' is, voeg het toe aan de where clause
    if (serverId !== '*') {
      Object.assign(conditions, { serverId });
    }

    return this.repository.find({
      where: conditions,
      order: {
        serverId: 'ASC',
        deadline: 'ASC',
      },
    });
  }

  async findTasksDueInRange(
    serverId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Task[]> {
    return this.repository.find({
      where: {
        serverId,
        deadline: Between(startDate, endDate),
        status: TaskStatus.PENDING,
      },
      order: {
        deadline: 'ASC',
      },
    });
  }

  async findCompletedTasksBefore(
    serverId: string,
    beforeDate: Date
  ): Promise<Task[]> {
    return this.repository.find({
      where: {
        serverId,
        status: TaskStatus.COMPLETED,
        completedAt: LessThanOrEqual(beforeDate),
      },
      order: {
        completedAt: 'ASC',
      },
    });
  }

  async getActiveServerIds(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder('task')
      .select('task.serverId')
      .where({
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
      })
      .groupBy('task.serverId')
      .getRawMany();

    return result.map(row => row.task_serverId);
  }

  async findTasksByAssignee(
    serverId: string,
    assigneeId: string
  ): Promise<Task[]> {
    const cacheKey = `${this.getServerCacheKey(serverId)}:assignee:${assigneeId}`;
    const cached = await this.getCacheArray(cacheKey);
    if (cached) return cached;

    const tasks = await this.repository.find({
      where: {
        serverId,
        assigneeId,
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
      },
      order: {
        deadline: 'ASC',
      },
    });

    await this.setCacheArray(cacheKey, tasks);
    return tasks;
  }

  // Helper method voor het aanmaken van tasks met defaults
  async createNewTask(data: {
    title: string;
    description: string;
    assigneeId: string;
    serverId: string;
    deadline?: Date;
    priority?: TaskPriority;
    category?: string;
    reminderFrequency?: number;
  }): Promise<Task> {
    const taskData: DeepPartial<Task> = {
      ...data,
      status: TaskStatus.PENDING,
      priority: data.priority ?? TaskPriority.MEDIUM,
    };

    return await this.create(taskData);
  }

  // Cache management overrides
  protected async clearServerCache(serverId: string): Promise<void> {
    await super.clearServerCache(serverId);
    // Clear additional cache keys
    const pendingKey = `${this.getServerCacheKey(serverId)}:pending`;
    await this.clearCache(pendingKey);
  }
}