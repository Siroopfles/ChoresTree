import {
  RetryOptions,
  MaxRetriesExceededError,
  CircuitBreakerOpenError,
} from '../interfaces/retry.interface';

/**
 * Calculates exponential backoff delay
 */
export const calculateBackoff = (attempt: number, baseDelay: number, maxDelay: number): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * (delay * 0.1);
};

/**
 * Class to manage circuit breaker state
 */
export class CircuitBreaker {
  private state: {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number | null;
  } = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: null,
  };

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000,
  ) {}

  public recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.threshold) {
      this.state.isOpen = true;
    }
  }

  public recordSuccess(): void {
    this.state.failureCount = 0;
    this.state.lastFailureTime = null;
    this.state.isOpen = false;
  }

  public isOpen(): boolean {
    if (!this.state.isOpen) {
      return false;
    }

    if (this.state.lastFailureTime && Date.now() - this.state.lastFailureTime > this.resetTimeout) {
      this.state.isOpen = false;
      this.state.failureCount = 0;
      return false;
    }

    return true;
  }
}

/**
 * Retry decorator factory
 */
export function withRetry(options: RetryOptions) {
  const circuitBreaker = new CircuitBreaker();

  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') {
      throw new Error('Cannot apply retry decorator to undefined method');
    }

    descriptor.value = async function (this: object, ...args: unknown[]): Promise<unknown> {
      if (circuitBreaker.isOpen()) {
        throw new CircuitBreakerOpenError();
      }

      for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        try {
          const result = await originalMethod.apply(this, args);
          circuitBreaker.recordSuccess();
          return result;
        } catch (error) {
          if (error instanceof Error) {
            const isRetriable = options.retryableErrors.some(
              (errorType) => error instanceof errorType,
            );

            if (!isRetriable) {
              throw error;
            }

            circuitBreaker.recordFailure();

            if (attempt < options.maxAttempts - 1) {
              const delay = calculateBackoff(attempt, options.backoffMs, options.maxBackoffMs);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          } else {
            throw error;
          }
        }
      }

      throw new MaxRetriesExceededError(options.maxAttempts);
    };

    return descriptor;
  };
}

/**
 * Helper function to wrap a function with retry logic
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const circuitBreaker = new CircuitBreaker();

  if (circuitBreaker.isOpen()) {
    throw new CircuitBreakerOpenError();
  }

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      const result = await fn();
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        const isRetriable = options.retryableErrors.some((errorType) => error instanceof errorType);

        if (!isRetriable) {
          throw error;
        }

        circuitBreaker.recordFailure();

        if (attempt < options.maxAttempts - 1) {
          const delay = calculateBackoff(attempt, options.backoffMs, options.maxBackoffMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } else {
        throw error;
      }
    }
  }

  throw new MaxRetriesExceededError(options.maxAttempts);
}
