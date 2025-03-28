/**
 * Interface for retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Initial backoff delay in milliseconds */
  backoffMs: number;

  /** Maximum backoff delay in milliseconds */
  maxBackoffMs: number;

  /** Array of error types that should trigger a retry */
  retryableErrors: Array<{ new (message?: string): Error }>;
}

/**
 * Base class for retriable errors
 */
export class RetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetriableError';
  }
}

/**
 * Error thrown when max retry attempts are exceeded
 */
export class MaxRetriesExceededError extends Error {
  constructor(attempts: number) {
    super(`Max retry attempts (${attempts}) exceeded`);
    this.name = 'MaxRetriesExceededError';
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor() {
    super('Circuit breaker is open');
    this.name = 'CircuitBreakerOpenError';
  }
}
