import { Repository, EntityTarget } from 'typeorm';
import { NotificationEntity } from '@v2/atomic/atoms/database/entities/NotificationEntity';
import { BaseRepositoryImpl } from '../BaseRepositoryImpl';
import { CacheProvider, Cacheable } from '@v2/core/cache';

/**
 * Notification repository implementation with caching support
 */
export class NotificationRepositoryImpl extends BaseRepositoryImpl<NotificationEntity> {
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
  }

  /**
   * Find pending notifications that are due
   */
  @Cacheable({ keyPrefix: 'due-notifications', ttl: 60, strategy: 'cache-aside' }) // Short TTL for active notifications
  async findDueNotifications(): Promise<NotificationEntity[]> {
    return this.createQueryBuilder('notification')
      .where('notification.status = :status', { status: 'PENDING' })
      .andWhere('notification.scheduledFor <= :now', { now: new Date() })
      .getMany();
  }

  /**
   * Find notifications for a specific task
   */
  @Cacheable({ keyPrefix: 'task-notifications', strategy: 'cache-aside' })
  async findByTaskId(taskId: string): Promise<NotificationEntity[]> {
    return this.find({ taskId });
  }

  /**
   * Find notifications for a specific user
   */
  @Cacheable({ keyPrefix: 'user-notifications', strategy: 'cache-aside' })
  async findByTargetUser(userId: string): Promise<NotificationEntity[]> {
    return this.find({ targetUserId: userId });
  }

  /**
   * Find recurring notifications that need processing
   */
  @Cacheable({ keyPrefix: 'recurring-notifications', strategy: 'cache-aside' })
  async findActiveRecurringNotifications(): Promise<NotificationEntity[]> {
    const now = new Date();
    
    return this.createQueryBuilder('notification')
      .where('notification.isRecurring = :isRecurring', { isRecurring: true })
      .andWhere('notification.status != :status', { status: 'CANCELLED' })
      .andWhere(
        '(notification.recurrenceEndDate IS NULL OR notification.recurrenceEndDate >= :now)',
        { now }
      )
      .getMany();
  }

  /**
   * Find failed notifications that can be retried
   */
  @Cacheable({ keyPrefix: 'retry-notifications', strategy: 'cache-aside' })
  async findRetryableNotifications(): Promise<NotificationEntity[]> {
    return this.createQueryBuilder('notification')
      .where('notification.status = :status', { status: 'FAILED' })
      .andWhere('notification.retryCount < :maxRetries', { maxRetries: 3 })
      .getMany();
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
    return this.createQueryBuilder('notification')
      .where('notification.scheduledFor BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      })
      .andWhere('notification.status = :status', { status: 'PENDING' })
      .getMany();
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
    const [pending, sent, failed, retryable] = await Promise.all([
      this.count({ status: 'PENDING' }),
      this.count({ status: 'SENT' }),
      this.count({ status: 'FAILED' }),
      this.createQueryBuilder('notification')
        .where('notification.status = :status', { status: 'FAILED' })
        .andWhere('notification.retryCount < :maxRetries', { maxRetries: 3 })
        .getCount()
    ]);

    return {
      pending,
      sent,
      failed,
      retryable
    };
  }

  /**
   * Cancel all notifications for a task
   */
  async cancelTaskNotifications(taskId: string): Promise<void> {
    await this.createQueryBuilder('notification')
      .update(NotificationEntity)
      .set({ status: 'CANCELLED' })
      .where('taskId = :taskId', { taskId })
      .andWhere('status = :status', { status: 'PENDING' })
      .execute();
    
    await this.clearEntityCache();
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