import { z } from 'zod';

/**
 * Validator for notification creation commands
 */
export const CreateNotificationCommandValidator = z.object({
  type: z.enum(['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE']),
  scheduledFor: z.date(),
  channelId: z.string(),
  taskId: z.string(),
  targetUserId: z.string().optional(),
  targetRoleId: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: z.string().optional(),
  recurrenceEndDate: z.date().optional(),
  customMessage: z.string().optional()
});

export type CreateNotificationCommand = z.infer<typeof CreateNotificationCommandValidator>;