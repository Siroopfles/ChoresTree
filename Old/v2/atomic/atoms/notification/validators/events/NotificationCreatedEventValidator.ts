import { z } from 'zod';

/**
 * Validator for notification created events
 */
export const NotificationCreatedEventValidator = z.object({
  notificationId: z.string(),
  type: z.enum(['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE']),
  scheduledFor: z.date(),
  channelId: z.string(),
  taskId: z.string(),
  targetUserId: z.string().optional(),
  targetRoleId: z.string().optional(),
  isRecurring: z.boolean(),
  recurrencePattern: z.string().optional(),
  recurrenceEndDate: z.date().optional(),
  customMessage: z.string().optional(),
  timestamp: z.date()
});

export type NotificationCreatedEvent = z.infer<typeof NotificationCreatedEventValidator>;