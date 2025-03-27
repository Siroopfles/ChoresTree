import { SelectQueryBuilder, Repository } from 'typeorm';
import { NotificationEntity } from '@v2/atomic/atoms/database/entities/NotificationEntity';
import { CommonFilters } from '../filters/CommonFilters';
import { Cacheable } from '@v2/core/cache';

interface NotificationQueryOptions {
  page?: number;
  pageSize?: number;
  orderBy?: keyof NotificationEntity;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean;
  withTask?: boolean;
  serverId?: string;
  taskId?: string;
  targetUserId?: string;
  targetRoleId?: string;
  types?: NotificationEntity['type'][];
  statuses?: NotificationEntity['status'][];
  scheduledBefore?: Date;
  scheduledAfter?: Date;
  isRecurring?: boolean;
}

/**
 * Optimized query builder for Notification entities
 */
export class NotificationQueryBuilder {
  private queryBuilder: SelectQueryBuilder<NotificationEntity>;
  private repository: Repository<NotificationEntity>;

  constructor(repository: Repository<NotificationEntity>) {
    this.repository = repository;
    this.queryBuilder = repository.createQueryBuilder('notification');
  }

  /**
   * Configure eager loading for related entities
   */
  private configureEagerLoading(options: NotificationQueryOptions): this {
    if (options.withTask) {
      this.queryBuilder
        .leftJoinAndSelect('notification.task', 'task')
        .addSelect(['task.id', 'task.title', 'task.status', 'task.dueDate']);
    }

    return this;
  }

  /**
   * Apply notification-specific filters
   */
  private applyNotificationFilters(options: NotificationQueryOptions): this {
    if (options.types?.length) {
      this.queryBuilder.andWhere('notification.type IN (:...types)', { 
        types: options.types 
      });
    }

    if (options.statuses?.length) {
      this.queryBuilder.andWhere('notification.status IN (:...statuses)', { 
        statuses: options.statuses 
      });
    }

    if (options.scheduledBefore || options.scheduledAfter) {
      CommonFilters.addDateRange(
        this.queryBuilder,
        'scheduledFor' as keyof NotificationEntity,
        options.scheduledAfter,
        options.scheduledBefore
      );
    }

    if (options.isRecurring !== undefined) {
      this.queryBuilder.andWhere('notification.isRecurring = :isRecurring', {
        isRecurring: options.isRecurring
      });
    }

    return this;
  }

  /**
   * Build base query with common configurations
   */
  public baseQuery(options: NotificationQueryOptions = {}): this {
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
   * Find pending notifications that need to be sent
   */
  @Cacheable({ keyPrefix: 'pending-notifications', strategy: 'cache-aside' })
  public async findPendingNotifications(): Promise<NotificationEntity[]> {
    return this.baseQuery({ withTask: true })
      .queryBuilder
      .where('notification.status = :status', { status: 'PENDING' })
      .andWhere('notification.scheduledFor <= :now', { now: new Date() })
      .orderBy('notification.scheduledFor', 'ASC')
      .cache(true)
      .getMany();
  }

  /**
   * Find failed notifications that can be retried
   */
  @Cacheable({ keyPrefix: 'retry-notifications', strategy: 'cache-aside' })
  public async findRetryableNotifications(): Promise<NotificationEntity[]> {
    return this.baseQuery({ withTask: true })
      .queryBuilder
      .where('notification.status = :status', { status: 'FAILED' })
      .andWhere('notification.retryCount < :maxRetries', { maxRetries: 3 })
      .orderBy('notification.scheduledFor', 'ASC')
      .cache(true)
      .getMany();
  }

  /**
   * Find upcoming notifications for channel
   */
  @Cacheable({ keyPrefix: 'channel-notifications', strategy: 'cache-aside' })
  public async findChannelNotifications(
    channelId: string,
    options: NotificationQueryOptions = {}
  ): Promise<NotificationEntity[]> {
    return this.baseQuery({
      ...options,
      withTask: true,
      orderBy: 'scheduledFor' as keyof NotificationEntity,
      orderDirection: 'ASC'
    })
      .queryBuilder
      .where('notification.channelId = :channelId', { channelId })
      .andWhere('notification.status = :status', { status: 'PENDING' })
      .cache(true)
      .getMany();
  }

  /**
   * Find notifications with full filtering and pagination
   */
  @Cacheable({ keyPrefix: 'filtered-notifications', strategy: 'cache-aside' })
  public async findNotifications(
    options: NotificationQueryOptions = {}
  ): Promise<NotificationEntity[]> {
    return this.baseQuery(options)
      .applyNotificationFilters(options)
      .queryBuilder
      .cache(true)
      .getMany();
  }

  /**
   * Get notification statistics with optimized counting
   */
  @Cacheable({ keyPrefix: 'notification-stats', strategy: 'cache-aside' })
  public async getNotificationStatistics(serverId: string): Promise<{
    total: number;
    pending: number;
    failed: number;
    sent: number;
    retryable: number;
  }> {
    const stats = await this.repository
      .createQueryBuilder('notification')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN notification.status = :pending THEN 1 END) as pending',
        'COUNT(CASE WHEN notification.status = :failed THEN 1 END) as failed',
        'COUNT(CASE WHEN notification.status = :sent THEN 1 END) as sent'
      ])
      .where('notification.serverId = :serverId', { serverId })
      .setParameters({
        pending: 'PENDING',
        failed: 'FAILED',
        sent: 'SENT'
      })
      .cache(true)
      .getRawOne();

    const retryable = await this.repository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: 'FAILED' })
      .andWhere('notification.retryCount < :maxRetries', { maxRetries: 3 })
      .andWhere('notification.serverId = :serverId', { serverId })
      .cache(true)
      .getCount();

    return {
      total: Number(stats.total),
      pending: Number(stats.pending),
      failed: Number(stats.failed),
      sent: Number(stats.sent),
      retryable
    };
  }
}