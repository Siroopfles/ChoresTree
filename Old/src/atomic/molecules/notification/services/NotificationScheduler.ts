import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import { NotificationPriority, Notification } from '../../../atoms/notification/types';
import { NotificationError } from '../../../atoms/notification/errors';
import { validateNotification } from '../../../atoms/notification/validation';
import { NotificationDispatcher } from './NotificationDispatcher';
import { TaskManagementService } from '../../task/services/TaskManagementService';

interface ScheduleOptions {
  cronExpression: string;
  priority?: NotificationPriority;
  batchSize?: number;
}

interface BatchProcessingOptions {
  maxBatchSize: number;
  processingInterval: number; // in milliseconds
}

export class NotificationScheduler extends EventEmitter {
  private scheduledJobs: Map<string, CronJob> = new Map();
  private priorityQueues: Map<NotificationPriority, Notification[]> = new Map();
  private batchOptions: BatchProcessingOptions = {
    maxBatchSize: 10,
    processingInterval: 1000,
  };

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly taskService: TaskManagementService
  ) {
    super();
    this.initializePriorityQueues();
    this.startBatchProcessor();
  }

  /**
   * Schedule a notification with cron expression
   */
  public scheduleNotification(notification: unknown, options: ScheduleOptions): void {
    const validatedNotification = validateNotification(notification);
    
    try {
      const job = new CronJob(
        options.cronExpression,
        () => this.processScheduledNotification(validatedNotification),
        null,
        true
      );

      this.scheduledJobs.set(validatedNotification.id, job);
      this.emit('notification.scheduled', validatedNotification);
    } catch (error) {
      throw new NotificationError(
        `Failed to schedule notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Queue a notification for batch processing
   */
  public queueNotification(notification: unknown): void {
    const validatedNotification = validateNotification(notification);
    const queue = this.priorityQueues.get(validatedNotification.priority);
    
    if (!queue) {
      throw new NotificationError(`Invalid priority: ${validatedNotification.priority}`);
    }

    queue.push(validatedNotification);
    this.emit('notification.queued', validatedNotification);
  }

  /**
   * Cancel a scheduled notification
   */
  public cancelScheduledNotification(notificationId: string): void {
    const job = this.scheduledJobs.get(notificationId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(notificationId);
      this.emit('notification.cancelled', { id: notificationId });
    }
  }

  /**
   * Update batch processing options
   */
  public updateBatchOptions(options: Partial<BatchProcessingOptions>): void {
    this.batchOptions = {
      ...this.batchOptions,
      ...options,
    };
  }

  /**
   * Initialize priority queues
   */
  private initializePriorityQueues(): void {
    this.priorityQueues.set(NotificationPriority.URGENT, []);
    this.priorityQueues.set(NotificationPriority.HIGH, []);
    this.priorityQueues.set(NotificationPriority.MEDIUM, []);
    this.priorityQueues.set(NotificationPriority.LOW, []);
  }

  /**
   * Start the batch processor
   */
  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatch().catch(error => {
        this.emit('error', error);
      });
    }, this.batchOptions.processingInterval);
  }

  /**
   * Process a batch of notifications
   */
  private async processBatch(): Promise<void> {
    const batch: Notification[] = [];
    let remainingSize = this.batchOptions.maxBatchSize;

    // Process queues in priority order
    for (const priority of [
      NotificationPriority.URGENT,
      NotificationPriority.HIGH,
      NotificationPriority.MEDIUM,
      NotificationPriority.LOW
    ]) {
      const queue = this.priorityQueues.get(priority)!;
      
      while (queue.length > 0 && remainingSize > 0) {
        const notification = queue.shift()!;
        batch.push(notification);
        remainingSize--;
      }

      if (remainingSize === 0) break;
    }

    // Process the batch
    if (batch.length > 0) {
      this.emit('batch.processing', { size: batch.length });
      
      for (const notification of batch) {
        try {
          await this.dispatcher.sendNotification(notification);
          this.emit('notification.sent', notification);
        } catch (error) {
          this.emit('notification.error', { notification, error });
        }
      }

      this.emit('batch.completed', { size: batch.length });
    }
  }

  /**
   * Process a scheduled notification
   */
  private processScheduledNotification(notification: Notification): void {
    this.queueNotification(notification);
  }

  /**
   * Get current queue statistics
   */
  public getQueueStats(): Record<NotificationPriority, number> {
    const stats: Record<NotificationPriority, number> = {} as Record<NotificationPriority, number>;
    
    for (const [priority, queue] of this.priorityQueues.entries()) {
      stats[priority] = queue.length;
    }

    return stats;
  }
}