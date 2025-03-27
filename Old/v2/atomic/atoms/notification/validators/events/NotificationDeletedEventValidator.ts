import { z } from 'zod';

/**
 * Validator for notification deleted events
 */
export const NotificationDeletedEventValidator = z.object({
  notificationId: z.string(),
  serverId: z.string(),
  timestamp: z.date()
});

export type NotificationDeletedEvent = z.infer<typeof NotificationDeletedEventValidator>;