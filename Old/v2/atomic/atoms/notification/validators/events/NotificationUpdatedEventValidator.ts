import { z } from 'zod';

/**
 * Validator for notification updated events
 */
export const NotificationUpdatedEventValidator = z.object({
  notificationId: z.string(),
  changes: z.object({
    type: z.enum(['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE']).optional(),
    status: z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
    scheduledFor: z.date().optional(),
    channelId: z.string().optional(),
    targetUserId: z.string().optional(),
    targetRoleId: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrencePattern: z.string().optional(),
    recurrenceEndDate: z.date().optional(),
    customMessage: z.string().optional()
  }),
  timestamp: z.date()
});

export type NotificationUpdatedEvent = z.infer<typeof NotificationUpdatedEventValidator>;