import Redis from 'ioredis';
import { CommandError, RateLimitError } from '../../atoms/discord/types';
import { eventBus } from '../../../core/eventBus';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export class RateLimiter {
  private redis: Redis;
  private defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    max: 5, // 5 requests per minute
  };

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (error) => {
      eventBus.emit('rateLimiter.error', error);
    });

    this.redis.on('connect', () => {
      eventBus.emit('rateLimiter.connected', null);
    });
  }

  private getKey(userId: string, commandName: string): string {
    return `ratelimit:${userId}:${commandName}`;
  }

  public async checkRateLimit(
    userId: string,
    commandName: string,
    config: Partial<RateLimitConfig> = {},
  ): Promise<void> {
    const { windowMs, max } = { ...this.defaultConfig, ...config };
    const key = this.getKey(userId, commandName);

    // Get current count
    const count = await this.redis.incr(key);

    // Set expiry if this is the first request
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }

    if (count > max) {
      // Get remaining time
      const ttl = await this.redis.pttl(key);
      throw new RateLimitError(Math.ceil(ttl / 1000));
    }

    // Emit rate limit event
    eventBus.emit('rateLimiter.requestProcessed', {
      userId,
      commandName,
      remaining: max - count,
    });
  }

  public async close(): Promise<void> {
    await this.redis.quit();
    eventBus.emit('rateLimiter.closed', null);
  }
}

// Export factory function
export function createRateLimiter(redisUrl: string): RateLimiter {
  return new RateLimiter(redisUrl);
}
