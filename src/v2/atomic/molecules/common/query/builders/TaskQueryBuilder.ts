import { SelectQueryBuilder, Repository } from 'typeorm';
import { TaskEntity } from '@v2/atomic/atoms/database/entities/TaskEntity';
import { CommonFilters } from '../filters/CommonFilters';
import { Cacheable } from '@v2/core/cache';

interface TaskQueryOptions {
  page?: number;
  pageSize?: number;
  orderBy?: keyof TaskEntity;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean;
  withAssignee?: boolean;
  withServer?: boolean;
  serverId?: string;
  channelId?: string;
  assignedUserId?: string;
  status?: TaskEntity['status'][];
  priority?: TaskEntity['priority'][];
  dueBefore?: Date;
  dueAfter?: Date;
}

/**
 * Optimized query builder for Task entities
 */
export class TaskQueryBuilder {
  private queryBuilder: SelectQueryBuilder<TaskEntity>;
  private repository: Repository<TaskEntity>;

  constructor(repository: Repository<TaskEntity>) {
    this.repository = repository;
    this.queryBuilder = repository.createQueryBuilder('task');
  }

  /**
   * Configure eager loading for related entities
   */
  private configureEagerLoading(options: TaskQueryOptions): this {
    if (options.withAssignee) {
      this.queryBuilder
        .leftJoinAndSelect('task.assignee', 'assignee')
        .addSelect(['assignee.id', 'assignee.username']);
    }

    if (options.withServer) {
      this.queryBuilder
        .leftJoinAndSelect('task.server', 'server')
        .addSelect(['server.id', 'server.name']);
    }

    return this;
  }

  /**
   * Apply task-specific filters
   */
  private applyTaskFilters(options: TaskQueryOptions): this {
    if (options.status?.length) {
      this.queryBuilder.andWhere('task.status IN (:...status)', {
        status: options.status
      });
    }

    if (options.priority?.length) {
      this.queryBuilder.andWhere('task.priority IN (:...priority)', {
        priority: options.priority
      });
    }

    if (options.assignedUserId) {
      this.queryBuilder.andWhere('task.assignedUserId = :assignedUserId', {
        assignedUserId: options.assignedUserId
      });
    }

    if (options.channelId) {
      this.queryBuilder.andWhere('task.channelId = :channelId', {
        channelId: options.channelId
      });
    }

    if (options.dueBefore || options.dueAfter) {
      CommonFilters.addDateRange(
        this.queryBuilder,
        'dueDate' as keyof TaskEntity,
        options.dueAfter,
        options.dueBefore
      );
    }

    return this;
  }

  /**
   * Build base query with common configurations
   */
  public baseQuery(options: TaskQueryOptions = {}): this {
    this.configureEagerLoading(options);
    
    CommonFilters.addSoftDeleteFilter(
      this.queryBuilder,
      options.includeDeleted
    );

    CommonFilters.addServerScope(
      this.queryBuilder,
      options.serverId
    );

    if (options.orderBy) {
      CommonFilters.addOrdering(
        this.queryBuilder,
        options.orderBy,
        options.orderDirection
      );
    }

    if (options.page && options.pageSize) {
      CommonFilters.addPagination(
        this.queryBuilder,
        options.page,
        options.pageSize
      );
    }

    return this;
  }

  /**
   * Find tasks that need attention (overdue or high priority)
   */
  @Cacheable({ keyPrefix: 'attention-tasks', strategy: 'cache-aside' })
  public async findTasksNeedingAttention(serverId: string): Promise<TaskEntity[]> {
    return this.baseQuery({ serverId })
      .queryBuilder
      .where(
        '(task.dueDate < :now AND task.status NOT IN (:...completedStatuses)) OR task.priority = :highPriority',
        {
          now: new Date(),
          completedStatuses: ['COMPLETED', 'CANCELLED'],
          highPriority: 'HIGH'
        }
      )
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.priority', 'DESC')
      .cache(true)
      .getMany();
  }

  /**
   * Find tasks for dashboard overview with optimized loading
   */
  @Cacheable({ keyPrefix: 'dashboard-tasks', strategy: 'cache-aside' })
  public async findDashboardTasks(
    serverId: string,
    options: TaskQueryOptions = {}
  ): Promise<TaskEntity[]> {
    return this.baseQuery({
      ...options,
      serverId,
      withAssignee: true,
      orderBy: 'dueDate' as keyof TaskEntity,
      orderDirection: 'ASC'
    })
      .queryBuilder
      .cache(true)
      .getMany();
  }

  /**
   * Find tasks with full filtering and pagination
   */
  @Cacheable({ keyPrefix: 'filtered-tasks', strategy: 'cache-aside' })
  public async findTasks(options: TaskQueryOptions = {}): Promise<TaskEntity[]> {
    return this.baseQuery(options)
      .applyTaskFilters(options)
      .queryBuilder
      .cache(true)
      .getMany();
  }

  /**
   * Get task statistics with optimized counting
   */
  @Cacheable({ keyPrefix: 'task-stats', strategy: 'cache-aside' })
  public async getTaskStatistics(serverId: string): Promise<{
    total: number;
    overdue: number;
    completed: number;
    pending: number;
  }> {
    const stats = await this.repository
      .createQueryBuilder('task')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN task.dueDate < :now AND task.status NOT IN (:...completedStatuses) THEN 1 END) as overdue',
        'COUNT(CASE WHEN task.status = :completed THEN 1 END) as completed',
        'COUNT(CASE WHEN task.status = :pending THEN 1 END) as pending'
      ])
      .where('task.serverId = :serverId', { serverId })
      .setParameters({
        now: new Date(),
        completedStatuses: ['COMPLETED', 'CANCELLED'],
        completed: 'COMPLETED',
        pending: 'PENDING'
      })
      .cache(true)
      .getRawOne();

    return {
      total: Number(stats.total),
      overdue: Number(stats.overdue),
      completed: Number(stats.completed),
      pending: Number(stats.pending)
    };
  }
}