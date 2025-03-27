import { NotificationStatus } from '../../services/notification/types/NotificationStatus';
import { DeliveryResult } from '../../services/delivery/types/DeliveryResult';
import { NotificationData } from '../../services/notification/types/NotificationData';

export type NotificationChannel = 'email' | 'discord' | 'slack' | 'sms';

export interface Notification {
  id: string;
  template: string;
  data: NotificationData;
  channel: NotificationChannel;
  recipient: string;
  scheduledFor: Date;
  status: NotificationStatus;
  retryCount?: number;
  lastAttempt?: Date;
  deliveryResult?: DeliveryResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRepository {
  /**
   * Vindt alle notificaties die verzonden moeten worden
   */
  findPendingNotifications(): Promise<Notification[]>;

  /**
   * Update de status van een notificatie
   */
  updateStatus(id: string, status: NotificationStatus, message?: string): Promise<void>;

  /**
   * Verhoogt de retry counter voor een notificatie
   */
  incrementRetryCount(id: string): Promise<void>;

  /**
   * Markeert een notificatie als succesvol afgeleverd
   */
  markAsDelivered(id: string, result?: DeliveryResult): Promise<void>;

  /**
   * Vindt notificaties op basis van filters
   */
  findByFilters(filters: {
    status?: NotificationStatus[];
    channel?: NotificationChannel[];
    scheduledBefore?: Date;
    scheduledAfter?: Date;
    maxRetries?: number;
  }): Promise<Notification[]>;

  /**
   * Verwijdert oude notificaties
   */
  cleanupOldNotifications(before: Date): Promise<number>;
}