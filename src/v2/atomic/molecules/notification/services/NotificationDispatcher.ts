import { TextChannel } from 'discord.js';
import { NotificationQueue } from '../../../atoms/notification/types/types';

export class NotificationDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationDispatchError';
  }
}

interface RetryQueueItem {
  attempts: number;
  lastAttempt: Date;
  notification: NotificationQueue;
}

export class NotificationDispatcher {
  private static instance: NotificationDispatcher;
  private retryQueue: Map<string, RetryQueueItem> = new Map();
  
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly BATCH_SIZE = 5; // Number of messages to send in one batch

  private constructor() {}

  public static getInstance(): NotificationDispatcher {
    if (!NotificationDispatcher.instance) {
      NotificationDispatcher.instance = new NotificationDispatcher();
    }
    return NotificationDispatcher.instance;
  }

  /**
   * Send a notification with retry mechanism
   */
  async dispatch(
    channel: TextChannel,
    content: string,
    queueId: string,
    notification: NotificationQueue
  ): Promise<void> {
    try {
      await this.sendWithRetry(channel, content, queueId, notification);
    } catch (error) {
      throw new NotificationDispatchError(
        `Failed to dispatch notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send multiple notifications in batches
   */
  async dispatchBatch(
    channel: TextChannel,
    notifications: { content: string; queueId: string; notification: NotificationQueue }[]
  ): Promise<void> {
    try {
      for (let i = 0; i < notifications.length; i += this.BATCH_SIZE) {
        const batch = notifications.slice(i, i + this.BATCH_SIZE);
        await Promise.all(
          batch.map(({ content, queueId, notification }) =>
            this.dispatch(channel, content, queueId, notification)
          )
        );
        
        // Add small delay between batches to avoid rate limits
        if (i + this.BATCH_SIZE < notifications.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      throw new NotificationDispatchError(
        `Failed to dispatch batch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async sendWithRetry(
    channel: TextChannel,
    content: string,
    queueId: string,
    notification: NotificationQueue
  ): Promise<void> {
    try {
      await channel.send(content);
      this.retryQueue.delete(queueId);
    } catch {
      const queueItem = this.retryQueue.get(queueId) || {
        attempts: 0,
        lastAttempt: new Date(0),
        notification
      };

      if (queueItem.attempts >= this.MAX_RETRIES) {
        this.retryQueue.delete(queueId);
        throw new NotificationDispatchError('Max retry attempts reached');
      }

      const now = new Date();
      if (now.getTime() - queueItem.lastAttempt.getTime() < this.RETRY_DELAY) {
        return; // Wait until retry delay has passed
      }

      // Update retry information
      this.retryQueue.set(queueId, {
        attempts: queueItem.attempts + 1,
        lastAttempt: now,
        notification
      });

      // Schedule retry
      setTimeout(() => {
        this.sendWithRetry(channel, content, queueId, notification).catch(console.error);
      }, this.RETRY_DELAY);
    }
  }

  /**
   * Get all notifications in retry queue
   */
  getRetryQueue(): Map<string, RetryQueueItem> {
    return new Map(this.retryQueue);
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(): void {
    this.retryQueue.clear();
  }
}