/**
 * Custom error types for the notification system
 */

export class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class TemplateError extends NotificationError {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class NotificationRateLimitError extends NotificationError {
  serverId: string;
  retryAfter: number;

  constructor(serverId: string, retryAfter: number, message?: string) {
    super(message || `Rate limit exceeded for server ${serverId}. Retry after ${retryAfter}ms`);
    this.name = 'NotificationRateLimitError';
    this.serverId = serverId;
    this.retryAfter = retryAfter;
  }
}

export class NotificationQueueError extends NotificationError {
  queueId: string;

  constructor(queueId: string, message: string) {
    super(`Queue error for ${queueId}: ${message}`);
    this.name = 'NotificationQueueError';
    this.queueId = queueId;
  }
}

export class NotificationDeliveryError extends NotificationError {
  notificationId: string;
  retryable: boolean;

  constructor(notificationId: string, message: string, retryable = true) {
    super(`Delivery error for notification ${notificationId}: ${message}`);
    this.name = 'NotificationDeliveryError';
    this.notificationId = notificationId;
    this.retryable = retryable;
  }
}

export class TemplateValidationError extends TemplateError {
  templateId: string;
  validationErrors: string[];

  constructor(templateId: string, validationErrors: string[]) {
    super(`Template validation failed for ${templateId}: ${validationErrors.join(', ')}`);
    this.name = 'TemplateValidationError';
    this.templateId = templateId;
    this.validationErrors = validationErrors;
  }
}