import { NotificationType as LegacyNotificationType } from '@/atomic/atoms/notification/types';
import { NotificationType } from './enums';

/**
 * Maps legacy notification types to v2 notification types
 */
export function mapLegacyNotificationType(type: LegacyNotificationType): NotificationType {
  switch (type) {
    case LegacyNotificationType.REMINDER:
      return NotificationType.TASK_REMINDER;
    case LegacyNotificationType.TASK_CREATED:
      return NotificationType.TASK_CREATED;
    case LegacyNotificationType.TASK_UPDATED:
      return NotificationType.TASK_UPDATED;
    case LegacyNotificationType.TASK_COMPLETED:
      return NotificationType.TASK_COMPLETED;
    case LegacyNotificationType.TASK_OVERDUE:
      return NotificationType.TASK_OVERDUE;
    default:
      throw new Error(`Unknown legacy notification type: ${type}`);
  }
}

/**
 * Maps v2 notification types to legacy notification types
 */
export function mapToLegacyNotificationType(type: NotificationType): LegacyNotificationType {
  switch (type) {
    case NotificationType.TASK_REMINDER:
      return LegacyNotificationType.REMINDER;
    case NotificationType.TASK_CREATED:
      return LegacyNotificationType.TASK_CREATED;
    case NotificationType.TASK_UPDATED:
      return LegacyNotificationType.TASK_UPDATED;
    case NotificationType.TASK_COMPLETED:
      return LegacyNotificationType.TASK_COMPLETED;
    case NotificationType.TASK_OVERDUE:
      return LegacyNotificationType.TASK_OVERDUE;
    case NotificationType.TASK_DUE:
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.SYSTEM_ALERT:
      // New types that don't exist in legacy - map to closest equivalent
      return LegacyNotificationType.REMINDER;
    default:
      throw new Error(`Unknown v2 notification type: ${type}`);
  }
}