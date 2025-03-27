import { z } from 'zod';

/**
 * Validator for notification deletion commands
 */
export const DeleteNotificationCommandValidator = z.object({
  id: z.string(),
  serverId: z.string()
});

export type DeleteNotificationCommand = z.infer<typeof DeleteNotificationCommandValidator>;