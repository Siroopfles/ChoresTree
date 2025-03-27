import { z } from 'zod';
import { notificationSchema, notificationTemplateSchema, rateLimitConfigSchema } from './schemas';
import { TemplateValidationError, NotificationError } from '../errors';
import type { Notification, NotificationTemplate, RateLimitConfig } from '../types';

/**
 * Validate a notification template
 */
export function validateTemplate(template: unknown): NotificationTemplate {
  try {
    return notificationTemplateSchema.parse(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Safely extract template ID or use "unknown" if not available
      const templateData = template as Record<string, unknown>;
      const templateId = typeof templateData?.id === 'string' ? templateData.id : 'unknown';
        
      throw new TemplateValidationError(
        templateId,
        error.errors.map((e) => e.message)
      );
    }
    throw error;
  }
}

/**
 * Validate a notification
 */
export function validateNotification(notification: unknown): Notification {
  try {
    return notificationSchema.parse(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new NotificationError(
        `Invalid notification: ${error.errors.map((e) => e.message).join(', ')}`
      );
    }
    throw error;
  }
}


/**
 * Validate rate limit configuration
 */
export function validateRateLimitConfig(config: unknown): RateLimitConfig {
  try {
    return rateLimitConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new NotificationError(
        `Invalid rate limit config: ${error.errors.map((e) => e.message).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Validate template variables against required variables
 */
export function validateTemplateVariables(
  template: NotificationTemplate,
  variables: Record<string, string>
): void {
  // Extract variables from template string using regex
  const variableRegex = /{([^}]+)}/g;
  const requiredVariables = new Set<string>();
  let match;

  while ((match = variableRegex.exec(template.template)) !== null) {
    requiredVariables.add(match[1]);
  }

  // Check for missing variables
  const missingVariables = Array.from(requiredVariables).filter(
    (variable) => !(variable in variables)
  );

  if (missingVariables.length > 0) {
    throw new TemplateValidationError(template.id, [
      `Missing required variables: ${missingVariables.join(', ')}`,
    ]);
  }
}