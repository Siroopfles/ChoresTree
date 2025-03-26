/**
 * Base error class for event-related errors
 */
export class EventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventError';
  }
}

/**
 * Thrown when event validation fails
 */
export class EventValidationError extends EventError {
  constructor(message: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

/**
 * Thrown when event publishing fails
 */
export class EventPublishError extends EventError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'EventPublishError';
  }
}

/**
 * Thrown when handler registration fails
 */
export class HandlerRegistrationError extends EventError {
  constructor(message: string) {
    super(message);
    this.name = 'HandlerRegistrationError';
  }
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends EventError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}