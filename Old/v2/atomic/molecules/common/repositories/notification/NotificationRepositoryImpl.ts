import { Repository, EntityTarget } from 'typeorm';
import { NotificationEntity } from '@v2/atomic/atoms/database/entities/NotificationEntity';
import { BaseRepositoryImpl } from '../BaseRepositoryImpl';
import { CacheProvider, Cacheable } from '@v2/core/cache';
import { NotificationQueryBuilder } from '../../query/builders/NotificationQueryBuilder';

/**
 * Notification repository implementation with caching support
 */
export class NotificationRepositoryImpl extends BaseRepositoryImpl<NotificationEntity> {
  private queryBuilder: NotificationQueryBuilder;

  constructor(
    repository: Repository<NotificationEntity>,
    cacheProvider: CacheProvider
  ) {
    super(
      repository,
      'Notification',
      NotificationEntity as EntityTarget<NotificationEntity>,
      cacheProvider
    );
    this.queryBuilder = new NotificationQueryBuilder(repository);
  }

  /**
   * Find pending notifications that are due
   */
  @Cacheable({ keyPrefix: 'due-notifications', ttl: 60, strategy: 'cache-aside' }) // Short TTL for active notifications
  async findDueNotifications(): Promise<NotificationEntity[]> {
    return this.queryBuilder.findPendingNotifications();
  }

  /**
   * Find notifications for a specific task
   */
  @Cacheable({ keyPrefix: 'task-notifications', strategy: 'cache-aside' })
  async findByTaskId(taskId: string): Promise<NotificationEntity[]> {
    return this.queryBuilder.findNotifications({
      taskId,
      withTask: true,
      orderBy: 'scheduledFor'
    });
  }

  /**
   * Find notifications for a specific user
   */
  @Cacheable({ keyPrefix: 'user-notifications', strategy: 'cache-aside' })
  async findByTargetUser(userId: string): Promise<NotificationEntity[]> {
    return this.queryBuilder.findNotifications({
      targetUserId: userId,
      withTask: true,
      orderBy: 'scheduledFor'
    });
  }

  /**
   * Find recurring notifications that need processing
   */
  @Cacheable({ keyPrefix: 'recurring-notifications', strategy: 'cache-aside' })
  async findActiveRecurringNotifications(): Promise<NotificationEntity[]> {
    return this.queryBuilder.findNotifications({
      isRecurring: true,
      statuses: ['PENDING', 'SENT'],
      withTask: true,
      scheduledAfter: new Date(),
      orderBy: 'scheduledFor'
    });
  }

  /**
   * Find failed notifications that can be retried
   */
  @Cacheable({ keyPrefix: 'retry-notifications', strategy: 'cache-aside' })
  async findRetryableNotifications(): Promise<NotificationEntity[]> {
    return this.queryBuilder.findRetryableNotifications();
  }

  /**
   * Update notification status
   */
  async updateStatus(
    notificationId: string, 
    status: NotificationEntity['status'],
    error?: string
  ): Promise<NotificationEntity | null> {
    const updateData: Partial<NotificationEntity> = { status };
    
    if (status === 'FAILED' && error) {
      updateData.lastError = error;
      // Use raw query to increment retry count
      await this.createQueryBuilder('notification')
        .update(NotificationEntity)
        .set({ retryCount: () => 'COALESCE(retry_count, 0) + 1' })
        .where('id = :id', { id: notificationId })
        .execute();
    }

    return this.update(notificationId, updateData);
  }

  /**
   * Find notifications scheduled for a time range
   */
  @Cacheable({ keyPrefix: 'scheduled-notifications', strategy: 'cache-aside' })
  async findScheduledInRange(
    startDate: Date,
    endDate: Date
  ): Promise<NotificationEntity[]> {
    return this.queryBuilder.findNotifications({
      scheduledAfter: startDate,
      scheduledBefore: endDate,
      statuses: ['PENDING'],
      withTask: true,
      orderBy: 'scheduledFor'
    });
  }

  /**
   * Get notification statistics
   */
  @Cacheable({ keyPrefix: 'notification-stats', strategy: 'cache-aside' })
  async getStatistics(): Promise<{
    pending: number;
    sent: number;
    failed: number;
    retryable: number;
  }> {
    return this.queryBuilder.getNotificationStatistics(this.getCurrentServerId());
  }

  /**
   * Cancel all notifications for a task
   */
  async cancelTaskNotifications(taskId: string): Promise<void> {
    // Gebruik een geoptimaliseerde bulk update query
    await this.repository.update(
      {
        taskId,
        status: 'PENDING'
      },
      {
        status: 'CANCELLED'
      }
    );
    
    // Invalideer gerelateerde caches
    await Promise.all([
      this.clearEntityCache(),
      this.cacheProvider.deletePattern(`notification-stats:*`),
      this.cacheProvider.deletePattern(`task-notifications:${taskId}:*`)
    ]);
  }

  private getCurrentServerId(): string {
    // TODO: Implement server context management
    throw new Error('Not implemented');
  }

  /**
   * Process recurring notification
   */
  async processRecurringNotification(
    notificationId: string,
    nextScheduledDate: Date
  ): Promise<NotificationEntity | null> {
    const notification = await this.findById(notificationId);
    
    if (!notification || !notification.isRecurring || !notification.isRecurrenceActive()) {
      return null;
    }

    // Create new notification without spreading the old one
    const newNotification = this.repository.create({
      type: notification.type,
      channelId: notification.channelId,
      targetUserId: notification.targetUserId,
      targetRoleId: notification.targetRoleId,
      isRecurring: notification.isRecurring,
      recurrencePattern: notification.recurrencePattern,
      recurrenceEndDate: notification.recurrenceEndDate,
      customMessage: notification.customMessage,
      taskId: notification.taskId,
      scheduledFor: nextScheduledDate,
      status: 'PENDING',
      retryCount: 0
    });

    return this.create(newNotification);
  }
}