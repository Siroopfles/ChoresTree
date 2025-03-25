/**
 * Type of notification being sent
 */
export enum NotificationType {
  // Bestaande types
  REMINDER = 'reminder',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  // Nieuwe types voor v2
  TASK_REMINDER = 'task_reminder',
  TASK_DUE = 'task_due',
  TASK_ASSIGNED = 'task_assigned',
  SYSTEM_ALERT = 'system_alert',
}

/**
 * Priority level of the notification
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Current status of the notification in the system
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED', // Nieuw in v2
  SENDING = 'SENDING', // Nieuw in v2
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
}

/**
 * Frequency of reminders
 */
export enum ReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}