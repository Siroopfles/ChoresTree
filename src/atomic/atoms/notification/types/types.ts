import { NotificationType, NotificationPriority, NotificationStatus } from './enums';

/**
 * Base notification template interface
 */
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  variables: string[]; // Template variables like {user}, {task}, etc.
  metadata?: Record<string, unknown>;
}

/**
 * Interface for a notification instance
 */
export interface Notification {
  id: string;
  templateId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientId: string;
  serverId: string;
  content: {
    title: string;
    message: string;
  };
  variables: Record<string, string>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  scheduledFor: Date;
  sentAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

/**
 * Interface for the notification queue
 */
export interface NotificationQueue {
  id: string;
  serverId: string;
  notifications: Notification[];
  metadata: {
    totalCount: number;
    processedCount: number;
    failedCount: number;
    lastProcessedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}