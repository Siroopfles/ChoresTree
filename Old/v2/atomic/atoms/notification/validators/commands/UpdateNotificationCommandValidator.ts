import { z } from 'zod';

/**
 * Validator for notification update commands
 */
export const UpdateNotificationCommandValidator = z.object({
  id: z.string(),
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
});

export type UpdateNotificationCommand = z.infer<typeof UpdateNotificationCommandValidator>;