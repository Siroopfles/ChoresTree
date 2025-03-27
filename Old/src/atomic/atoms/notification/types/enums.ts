/**
 * Type of notification being sent
 */
export enum NotificationType {
  TASK_REMINDER = 'TASK_REMINDER',
  TASK_DUE = 'TASK_DUE',
  TASK_OVERDUE = 'TASK_OVERDUE',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
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
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
}