/**
 * Rate limit configuration for notification sending
 */
export interface RateLimitConfig {
  requestsPerSecond: number;  // Discord limit: 50 req/s
  burstSize: number;         // Maximum burst size allowed
  windowMs: number;          // Time window for rate limiting in milliseconds
}

/**
 * Rate limit state for a specific server
 */
export interface RateLimitState {
  serverId: string;
  requestCount: number;
  windowStart: Date;
  lastRequest: Date;
  isLimited: boolean;
}

/**
 * Rate limit error details
 */
export interface RateLimitError {
  serverId: string;
  retryAfter: number;    // Time in ms to wait before retrying
  requestCount: number;  // Current request count in window
  limit: number;        // Rate limit that was exceeded
}

/**
 * Default rate limit configuration aligned with Discord limits
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerSecond: 50,  // Discord's rate limit
  burstSize: 10,         // Allow small bursts
  windowMs: 1000,        // 1 second window
};