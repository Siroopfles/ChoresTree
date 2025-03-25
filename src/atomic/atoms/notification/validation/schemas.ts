import { z } from 'zod';
import { NotificationType, NotificationPriority, NotificationStatus } from '../types/enums';

/**
 * Template validation schema
 */
export const notificationTemplateSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  variables: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
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
export const notificationQueueSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string(),
  notifications: z.array(notificationSchema),
  metadata: z.object({
    totalCount: z.number().int().min(0),
    processedCount: z.number().int().min(0),
    failedCount: z.number().int().min(0),
    lastProcessedAt: z.date().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Rate limit config validation schema
 */
export const rateLimitConfigSchema = z.object({
  requestsPerSecond: z.number().int().min(1).max(100),
  burstSize: z.number().int().min(1),
  windowMs: z.number().int().min(100),
});

// Export type inference helpers
export type NotificationTemplate = z.infer<typeof notificationTemplateSchema>;
export type NotificationValidated = z.infer<typeof notificationSchema>;
export type NotificationQueue = z.infer<typeof notificationQueueSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;