import { Client as DiscordClient, TextChannel } from 'discord.js';
import { EventEmitter } from 'events';
import { 
  Notification,
  NotificationStatus,
  RateLimitConfig,
  RateLimitState 
} from '../../../atoms/notification/types';
import { 
  NotificationError,
  NotificationDeliveryError,
  NotificationRateLimitError 
} from '../../../atoms/notification/errors';
import { validateNotification, validateRateLimitConfig } from '../../../atoms/notification/validation';
import { DEFAULT_RATE_LIMIT } from '../../../atoms/notification/types/rateLimit';

/**
 * Handles dispatching notifications to Discord while respecting rate limits
 */
export class NotificationDispatcher extends EventEmitter {
  private rateLimits: Map<string, RateLimitState> = new Map();
  private retryQueue: Map<string, Notification[]> = new Map();
  private config: RateLimitConfig;

  constructor(
    private readonly discordClient: DiscordClient,
    config: Partial<RateLimitConfig> = {}
  ) {
    super();
    this.config = {
      ...DEFAULT_RATE_LIMIT,
      ...config
    };
    validateRateLimitConfig(this.config);
  }

  /**
   * Send a notification to Discord
   */
  public async sendNotification(notification: unknown): Promise<void> {
    const validatedNotification = validateNotification(notification);
    
    // Check rate limits
    if (this.isRateLimited(validatedNotification.serverId)) {
      await this.handleRateLimit(validatedNotification);
      return;
    }

    try {
      await this.dispatchToDiscord(validatedNotification);
      this.updateRateLimit(validatedNotification.serverId);
    } catch (error) {
      await this.handleSendError(validatedNotification, error);
    }
  }

  /**
   * Process retry queue for a server
   */
  public async processRetryQueue(serverId: string): Promise<void> {
    const retries = this.retryQueue.get(serverId) || [];
    if (retries.length === 0) return;

    if (this.isRateLimited(serverId)) {
      // Still rate limited, try again later
      return;
    }

    const notification = retries[0];
    try {
      await this.dispatchToDiscord(notification);
      this.updateRateLimit(serverId);
      
      // Remove from retry queue on success
      retries.shift();
      if (retries.length === 0) {
        this.retryQueue.delete(serverId);
      } else {
        this.retryQueue.set(serverId, retries);
      }
    } catch (error) {
      await this.handleSendError(notification, error);
    }
  }

  /**
   * Check if a server is currently rate limited
   */
  private isRateLimited(serverId: string): boolean {
    const state = this.rateLimits.get(serverId);
    if (!state) return false;

    const now = new Date();
    const windowExpired = now.getTime() - state.windowStart.getTime() > this.config.windowMs;

    if (windowExpired) {
      // Reset rate limit state if window expired
      this.rateLimits.delete(serverId);
      return false;
    }

    return state.requestCount >= this.config.requestsPerSecond;
  }

  /**
   * Update rate limit state for a server
   */
  private updateRateLimit(serverId: string): void {
    const now = new Date();
    const state = this.rateLimits.get(serverId);

    if (!state) {
      this.rateLimits.set(serverId, {
        serverId,
        requestCount: 1,
        windowStart: now,
        lastRequest: now,
        isLimited: false
      });
      return;
    }

    const windowExpired = now.getTime() - state.windowStart.getTime() > this.config.windowMs;
    
    if (windowExpired) {
      // Start new window
      state.windowStart = now;
      state.requestCount = 1;
    } else {
      state.requestCount++;
      state.isLimited = state.requestCount >= this.config.requestsPerSecond;
    }

    state.lastRequest = now;
    this.rateLimits.set(serverId, state);
  }

  /**
   * Actually send the notification to Discord
   */
  private async dispatchToDiscord(notification: Notification): Promise<void> {
    try {
      const channel = await this.discordClient.channels.fetch(notification.recipientId);
      if (!(channel instanceof TextChannel)) {
        throw new NotificationDeliveryError(
          notification.id,
          'Invalid channel type',
          false
        );
      }

      await channel.send({
        embeds: [{
          title: notification.content.title,
          description: notification.content.message,
          color: this.getPriorityColor(notification),
        }]
      });

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      this.emit('notification.sent', notification);
    } catch (error) {
      throw new NotificationDeliveryError(
        notification.id,
        error instanceof Error ? error.message : 'Unknown error',
        this.isRetryableError(error)
      );
    }
  }

  /**
   * Handle errors during notification sending
   */
  private async handleSendError(notification: Notification, error: unknown): Promise<void> {
    if (error instanceof NotificationDeliveryError) {
      notification.status = NotificationStatus.FAILED;
      notification.error = error.message;

      if (error.retryable && notification.retryCount < notification.maxRetries) {
        await this.addToRetryQueue(notification);
      }
      this.emit('notification.error', { notification, error });
    } else {
      this.emit('error', new NotificationError(
        `Unexpected error sending notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Handle rate limit by adding to retry queue
   */
  private async handleRateLimit(notification: Notification): Promise<void> {
    const retryAfter = this.getRetryAfter(notification.serverId);
    
    notification.status = NotificationStatus.RETRY;
    await this.addToRetryQueue(notification);

    const error = new NotificationRateLimitError(
      notification.serverId,
      retryAfter
    );
    this.emit('notification.rateLimit', { notification, error });
  }

  /**
   * Add a notification to the retry queue
   */
  private async addToRetryQueue(notification: Notification): Promise<void> {
    const retries = this.retryQueue.get(notification.serverId) || [];
    notification.retryCount++;
    retries.push(notification);
    this.retryQueue.set(notification.serverId, retries);
    this.emit('notification.queued', notification);
  }

  /**
   * Calculate retry delay for rate limited notifications
   */
  private getRetryAfter(serverId: string): number {
    const state = this.rateLimits.get(serverId);
    if (!state) return 0;

    const now = new Date();
    const windowEnd = new Date(state.windowStart.getTime() + this.config.windowMs);
    return Math.max(0, windowEnd.getTime() - now.getTime());
  }

  /**
   * Get Discord embed color based on notification priority
   */
  private getPriorityColor(notification: Notification): number {
    switch (notification.priority) {
      case 'URGENT':
        return 0xFF0000; // Red
      case 'HIGH':
        return 0xFFA500; // Orange
      case 'MEDIUM':
        return 0xFFFF00; // Yellow
      case 'LOW':
      default:
        return 0x00FF00; // Green
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors, temporary Discord API issues
      const retryableMessages = [
        'network',
        'timeout',
        'temporarily',
        '5xx',
        'server error'
      ];
      return retryableMessages.some(msg => 
        error.message.toLowerCase().includes(msg)
      );
    }
    return false;
  }
}