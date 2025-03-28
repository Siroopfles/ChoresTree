import { calculateBackoff, CircuitBreaker, withRetry, retryWithBackoff } from '../retry.utils';
import {
  RetryOptions,
  MaxRetriesExceededError,
  CircuitBreakerOpenError,
} from '../../interfaces/retry.interface';

describe('Retry Utilities', () => {
  describe('calculateBackoff', () => {
    it('should calculate exponential backoff with jitter', () => {
      const baseDelay = 100;
      const maxDelay = 1000;

      const delay1 = calculateBackoff(0, baseDelay, maxDelay);
      const delay2 = calculateBackoff(1, baseDelay, maxDelay);

      expect(delay1).toBeGreaterThanOrEqual(baseDelay);
      expect(delay1).toBeLessThanOrEqual(baseDelay * 1.1);
      expect(delay2).toBeGreaterThanOrEqual(baseDelay * 2);
      expect(delay2).toBeLessThanOrEqual(baseDelay * 2 * 1.1);
    });

    it('should respect max delay', () => {
      const baseDelay = 100;
      const maxDelay = 1000;

      const delay = calculateBackoff(5, baseDelay, maxDelay);
      expect(delay).toBeLessThanOrEqual(maxDelay * 1.1);
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(3, 1000);
    });

    it('should start closed', () => {
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should open after threshold failures', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should close after success', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should reset after timeout', async () => {
      circuitBreaker = new CircuitBreaker(3, 100);

      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.isOpen()).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(circuitBreaker.isOpen()).toBe(false);
    });
  });

  describe('withRetry decorator', () => {
    interface TestInstance {
      callCount: number;
      testMethod(): Promise<string>;
    }

    function createTestInstance(): TestInstance {
      const instance = {
        callCount: 0,
        async testMethod(): Promise<string> {
          this.callCount++;
          if (this.callCount < 3) {
            throw new Error('Temporary failure');
          }
          return 'success';
        },
      };

      // Manually apply decorator
      const descriptor = Object.getOwnPropertyDescriptor(instance, 'testMethod')!;
      const decoratedDescriptor = withRetry({
        maxAttempts: 3,
        backoffMs: 50,
        maxBackoffMs: 200,
        retryableErrors: [Error],
      })(instance, 'testMethod', descriptor);

      Object.defineProperty(instance, 'testMethod', decoratedDescriptor);
      return instance;
    }

    it('should retry until success', async () => {
      const instance = createTestInstance();
      const result = await instance.testMethod();

      expect(result).toBe('success');
      expect(instance.callCount).toBe(3);
    });

    it('should throw MaxRetriesExceededError', async () => {
      const instance = createTestInstance();
      instance.testMethod = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(instance.testMethod()).rejects.toThrow(MaxRetriesExceededError);
    });
  });

  describe('retryWithBackoff function', () => {
    const options: RetryOptions = {
      maxAttempts: 3,
      backoffMs: 50,
      maxBackoffMs: 200,
      retryableErrors: [Error],
    };

    it('should retry and succeed', async () => {
      let count = 0;
      const fn = async () => {
        count++;
        if (count < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, options);
      expect(result).toBe('success');
      expect(count).toBe(3);
    });

    it('should handle non-retryable errors', async () => {
      const customError = new TypeError('Not retryable');
      const fn = jest.fn().mockRejectedValue(customError);

      await expect(retryWithBackoff(fn, options)).rejects.toThrow(TypeError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect circuit breaker', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failure'));

      // Should trigger circuit breaker after multiple failures
      await expect(retryWithBackoff(fn, options)).rejects.toThrow(MaxRetriesExceededError);
      await expect(retryWithBackoff(fn, options)).rejects.toThrow(MaxRetriesExceededError);
      await expect(retryWithBackoff(fn, options)).rejects.toThrow(CircuitBreakerOpenError);
    });
  });
});
