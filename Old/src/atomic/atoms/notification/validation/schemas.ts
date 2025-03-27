import { z } from 'zod';
import { NotificationType, NotificationPriority, NotificationStatus } from '../types';

/**
 * Template validation schema
 */
export const notificationTemplateSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  serverId: z.string(),
  template: z.string().min(1).max(2000),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Notification validation schema
 */
export const notificationSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  priority: z.nativeEnum(NotificationPriority),
  status: z.nativeEnum(NotificationStatus),
  recipientId: z.string(),
  serverId: z.string(),
  content: z.object({
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(2000),
  }),
  variables: z.record(z.string()),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  scheduledFor: z.date(),
  sentAt: z.date().optional(),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  error: z.string().optional(),
});

/**
 * Queue validation schema
 */
/**
 * Rate limit config validation schema
 */
export const rateLimitConfigSchema = z.object({
  requestsPerSecond: z.number().int().min(1).max(100),
  windowMs: z.number().int().min(100),
});

// Export type inference helpers
export type ValidatedNotificationTemplate = z.infer<typeof notificationTemplateSchema>;
export type ValidatedNotification = z.infer<typeof notificationSchema>;
export type ValidatedRateLimitConfig = z.infer<typeof rateLimitConfigSchema>;