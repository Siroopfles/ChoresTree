import { Repository, EntityTarget, In, Between } from 'typeorm';
import { TaskEntity } from '@v2/atomic/atoms/database/entities/TaskEntity';
import { BaseRepositoryImpl } from '../BaseRepositoryImpl';
import { CacheProvider, Cacheable } from '@v2/core/cache';

/**
 * Task repository implementation with caching support
 */
export class TaskRepositoryImpl extends BaseRepositoryImpl<TaskEntity> {
  constructor(
    repository: Repository<TaskEntity>,
    cacheProvider: CacheProvider
  ) {
    super(
      repository,
      'Task',
      TaskEntity as EntityTarget<TaskEntity>,
      cacheProvider
    );
  }

  /**
   * Find tasks for a specific server
   */
  @Cacheable({ keyPrefix: 'server-tasks', strategy: 'cache-aside' })
  async findByServerId(serverId: string): Promise<TaskEntity[]> {
    return this.find({ serverId });
  }

  /**
   * Find tasks assigned to a user
   */
  @Cacheable({ keyPrefix: 'user-tasks', strategy: 'cache-aside' })
  async findByAssignedUser(userId: string): Promise<TaskEntity[]> {
    return this.find({ assignedUserId: userId });
  }

  /**
   * Find tasks by status
   */
  @Cacheable({ keyPrefix: 'status-tasks', strategy: 'cache-aside' })
  async findByStatus(status: TaskEntity['status']): Promise<TaskEntity[]> {
    return this.find({ status });
  }

  /**
   * Find overdue tasks
   */
  @Cacheable({ keyPrefix: 'overdue-tasks', strategy: 'cache-aside' })
  async findOverdueTasks(): Promise<TaskEntity[]> {
    return this.createQueryBuilder('task')
      .where('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: ['COMPLETED', 'CANCELLED']
      })
      .getMany();
  }

  /**
   * Find tasks due within time range
   */
  @Cacheable({ keyPrefix: 'due-range-tasks', strategy: 'cache-aside' })
  async findTasksDueInRange(startDate: Date, endDate: Date): Promise<TaskEntity[]> {
    return this.find({
      dueDate: Between(startDate, endDate)
    });
  }

  /**
   * Find tasks by priority
   */
  @Cacheable({ keyPrefix: 'priority-tasks', strategy: 'cache-aside' })
  async findByPriority(priority: TaskEntity['priority']): Promise<TaskEntity[]> {
    return this.find({ priority });
  }

  /**
   * Find tasks in specific channels
   */
  @Cacheable({ keyPrefix: 'channel-tasks', strategy: 'cache-aside' })
  async findByChannels(channelIds: string[]): Promise<TaskEntity[]> {
    return this.find({
      channelId: In(channelIds)
    });
  }

  /**
   * Update task status
   */
  async updateStatus(
    taskId: string,
    status: TaskEntity['status'],
    userId: string
  ): Promise<TaskEntity | null> {
    const task = await this.findById(taskId);
    
    if (!task || !task.canBeModifiedBy(userId, [])) {
      return null;
    }

    return this.update(taskId, { status });
  }

  /**
   * Assign task to user
   */
  async assignToUser(
    taskId: string,
    userId: string,
    assignerId: string
  ): Promise<TaskEntity | null> {
    const task = await this.findById(taskId);
    
    if (!task || !task.canBeModifiedBy(assignerId, [])) {
      return null;
    }

    return this.update(taskId, { assignedUserId: userId });
  }

  /**
   * Update task priority
   */
  async updatePriority(
    taskId: string,
    priority: TaskEntity['priority'],
    userId: string
  ): Promise<TaskEntity | null> {
    const task = await this.findById(taskId);
    
    if (!task || !task.canBeModifiedBy(userId, [])) {
      return null;
    }

    return this.update(taskId, { priority });
  }

  /**
   * Get task statistics for server
   */
  @Cacheable({ keyPrefix: 'server-stats', strategy: 'cache-aside' })
  async getServerStatistics(serverId: string): Promise<{
    total: number;
    completed: number;
    overdue: number;
    pending: number;
  }> {
    const tasks = await this.findByServerId(serverId);
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      overdue: tasks.filter(t => t.isOverdue()).length,
      pending: tasks.filter(t => t.status === 'PENDING').length
    };
  }
}