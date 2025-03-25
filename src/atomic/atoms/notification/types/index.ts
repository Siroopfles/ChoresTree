export enum NotificationType {
  REMINDER = 'reminder',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
}

export enum ReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum NotificationPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
}

export interface NotificationContent {
  title: string;
  message: string;
}

export interface Notification {
  id: string;
  templateId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientId: string;
  serverId: string;
  content: NotificationContent;
  variables: Record<string, string>;
  createdAt: Date;
  scheduledFor: Date;
  sentAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface ReminderSchedule {
  id: string;
  taskId: string;
  serverId: string;
  frequency: ReminderFrequency;
  nextReminder: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  serverId: string;
  template: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitConfig {
  windowMs: number;
  requestsPerSecond: number;
}

export interface RateLimitState {
  serverId: string;
  requestCount: number;
  windowStart: Date;
  lastRequest: Date;
  isLimited: boolean;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 1000,
  requestsPerSecond: 1
};

export interface ReminderEvent {
  taskId: string;
  scheduleId: string;
  serverId: string;
  timestamp: Date;
}

export interface NotificationEvent {
  type: NotificationType;
  notification: Notification;
  serverId: string;
  timestamp: Date;
}