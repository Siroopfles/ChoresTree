import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, LessThan, MoreThan, FindOptionsWhere } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BaseRepositoryImpl } from '../base/BaseRepositoryImpl';
import {
  NotificationEntity,
  NotificationStatus,
} from '../../../atoms/entities/notification.entity';
import { ICacheProvider } from '../../../core/cache/ICacheProvider';
import { RepositoryError } from '../../../atoms/errors/repository.error';

const RECENT_NOTIFICATIONS_TTL = 300; // 5 minuten
const CLEANUP_THRESHOLD_DAYS = 30; // 30 dagen voor cleanup
const RECENT_NOTIFICATIONS_LIMIT = 50; // Maximum aantal recente notificaties in cache

@Injectable()
export class NotificationRepository extends BaseRepositoryImpl<NotificationEntity> {
  constructor(
    @InjectConnection() connection: Connection,
    @Inject(CACHE_MANAGER) cacheManager: ICacheProvider,
  ) {
    super(connection, cacheManager, NotificationEntity);
  }

  /**
   * Vindt alle ongelezen notificaties voor een gebruiker
   * Gebruikt compound index voor efficiente querying
   */
  async findUnreadByUser(userId: string): Promise<NotificationEntity[]> {
    try {
      const cacheKey = `unread:${userId}`;
      const cached = await this.cacheManager.get<NotificationEntity[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const notifications = await this.repository.find({
        where: {
          recipientId: userId,
          status: NotificationStatus.UNREAD,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      // Cache voor korte tijd om real-time updates mogelijk te houden
      await this.cacheManager.set(cacheKey, notifications, 60); // 1 minuut TTL

      return notifications;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error finding unread notifications: ${error.message}`,
          'FIND_UNREAD_ERROR',
        );
      }
      throw error;
    }
  }

  /**
   * Markeert een notificatie als gelezen
   * Invalideert relevante caches
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    try {
      await this.transaction(async (repo) => {
        const notification = await repo.findById(id);

        if (!notification || notification.recipientId !== userId) {
          throw new RepositoryError(
            'Notification not found or unauthorized',
            'NOTIFICATION_NOT_FOUND',
          );
        }

        await repo.update(id, { status: NotificationStatus.READ });

        // Invalideer caches
        await this.cacheManager.invalidate(this.getCacheKey(id));
        await this.cacheManager.invalidate(`unread:${userId}`);
        await this.cacheManager.invalidate(`recent:${userId}`);
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error marking notification as read: ${error.message}`,
          'MARK_AS_READ_ERROR',
        );
      }
      throw error;
    }
  }

  /**
   * Haalt recente notificaties op met sliding window caching
   */
  async getRecentNotifications(userId: string): Promise<NotificationEntity[]> {
    try {
      const cacheKey = `recent:${userId}`;
      const cached = await this.cacheManager.get<NotificationEntity[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const notifications = await this.repository.find({
        where: {
          recipientId: userId,
          createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Laatste 24 uur
        },
        order: {
          createdAt: 'DESC',
        },
        take: RECENT_NOTIFICATIONS_LIMIT,
      });

      // Implementeer sliding window cache
      await this.cacheManager.set(cacheKey, notifications, RECENT_NOTIFICATIONS_TTL);

      return notifications;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error fetching recent notifications: ${error.message}`,
          'FETCH_RECENT_ERROR',
        );
      }
      throw error;
    }
  }

  /**
   * Ruimt oude notificaties op door ze te archiveren
   * Gebruikt time-based partitioning voor efficiëntie
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - CLEANUP_THRESHOLD_DAYS);

      // Gebruik partitionKey voor efficiënte cleanup
      const oldNotifications = await this.repository.find({
        where: {
          createdAt: LessThan(cleanupDate),
          partitionKey: LessThan(cleanupDate),
        },
        take: 1000, // Process in batches
      });

      // Batch verwerking voor betere performance
      if (oldNotifications.length > 0) {
        await this.repository.softDelete(oldNotifications.map((notification) => notification.id));

        // Invalideer relevante caches
        await Promise.all(
          oldNotifications.map((notification) =>
            Promise.all([
              this.cacheManager.invalidate(this.getCacheKey(notification.id)),
              this.cacheManager.invalidate(`unread:${notification.recipientId}`),
              this.cacheManager.invalidate(`recent:${notification.recipientId}`),
            ]),
          ),
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error cleaning up old notifications: ${error.message}`,
          'CLEANUP_ERROR',
        );
      }
      throw error;
    }
  }
}
