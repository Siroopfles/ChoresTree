import { Client as DiscordClient } from 'discord.js';
import { EventEmitter } from 'events';
import { NotificationDispatcher } from '../../molecules/notification/services/NotificationDispatcher';
import { NotificationScheduler } from '../../molecules/notification/services/NotificationScheduler';
import { TemplateManager } from '../../molecules/notification/services/TemplateManager';
import { TaskManagementService } from '../../molecules/task/services/TaskManagementService';
import { 
  Notification,
  NotificationTemplate,
  NotificationPriority,
  NotificationStatus,
  RateLimitConfig 
} from '../../atoms/notification/types';
import { validateTemplate, validateNotification } from '../../atoms/notification/validation';
import { NotificationError } from '../../atoms/notification/errors';

interface NotificationEngineConfig {
  rateLimits?: Partial<RateLimitConfig>;
  batchSize?: number;
  processingInterval?: number;
}

type NotificationEventMap = {
  'error': [NotificationError];
  'notification.scheduled': [Notification];
  'notification.sent': [Notification];
  'notification.error': [{ notification: Notification; error: Error }];
  'notification.queued': [Notification];
  'batch.processing': [{ size: number }];
  'batch.completed': [{ size: number }];
};

export class NotificationEngine extends EventEmitter {
  private readonly dispatcher: NotificationDispatcher;
  private readonly scheduler: NotificationScheduler;
  private readonly templateManager: TemplateManager;

  constructor(
    discordClient: DiscordClient,
    taskService: TaskManagementService,
    config: NotificationEngineConfig = {}
  ) {
    super();

    // Initialize core services
    this.dispatcher = new NotificationDispatcher(discordClient, config.rateLimits);
    this.templateManager = new TemplateManager();
    this.scheduler = new NotificationScheduler(this.dispatcher, taskService);

    // Configure batch processing if specified
    if (config.batchSize || config.processingInterval) {
      this.scheduler.updateBatchOptions({
        maxBatchSize: config.batchSize || 10,
        processingInterval: config.processingInterval || 1000,
      });
    }

    this.setupEventHandlers();
  }

  /**
   * Register a notification template
   */
  public registerTemplate(template: unknown): NotificationTemplate {
    const validatedTemplate = validateTemplate(template);
    return this.templateManager.registerTemplate(validatedTemplate);
  }

  /**
   * Schedule a notification with template
   */
  public async scheduleNotification(
    templateId: string,
    variables: Record<string, string>,
    options: {
      cronExpression: string;
      recipientId: string;
      serverId: string;
      priority?: NotificationPriority;
    }
  ): Promise<Notification> {
    // Apply template with variables
    const content = this.templateManager.applyTemplate(templateId, variables);

    // Create notification object
    const notification: Notification = {
      id: crypto.randomUUID(),
      templateId,
      type: this.templateManager.getTemplate(templateId).type,
      priority: options.priority || NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING,
      recipientId: options.recipientId,
      serverId: options.serverId,
      content,
      variables,
      createdAt: new Date(),
      scheduledFor: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    // Validate and schedule
    const validatedNotification = validateNotification(notification);
    this.scheduler.scheduleNotification(validatedNotification, {
      cronExpression: options.cronExpression,
      priority: options.priority,
    });

    return validatedNotification;
  }

  /**
   * Send a one-time notification immediately
   */
  public async sendNotification(
    templateId: string,
    variables: Record<string, string>,
    options: {
      recipientId: string;
      serverId: string;
      priority?: NotificationPriority;
    }
  ): Promise<void> {
    // Apply template with variables
    const content = this.templateManager.applyTemplate(templateId, variables);

    // Create notification object
    const notification: Notification = {
      id: crypto.randomUUID(),
      templateId,
      type: this.templateManager.getTemplate(templateId).type,
      priority: options.priority || NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING,
      recipientId: options.recipientId,
      serverId: options.serverId,
      content,
      variables,
      createdAt: new Date(),
      scheduledFor: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    // Validate and send
    const validatedNotification = validateNotification(notification);
    await this.dispatcher.sendNotification(validatedNotification);
  }

  /**
   * Cancel a scheduled notification
   */
  public cancelNotification(notificationId: string): void {
    this.scheduler.cancelScheduledNotification(notificationId);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.dispatcher.on('error', (error: Error) => {
      this.emit('error', error instanceof NotificationError ? error : new NotificationError(error.message));
    });

    this.scheduler.on('error', (error: Error) => {
      this.emit('error', error instanceof NotificationError ? error : new NotificationError(error.message));
    });

    this.dispatcher.on('notification.sent', (notification: Notification) => 
      this.emit('notification.sent', notification));

    this.dispatcher.on('notification.error', (data: { notification: Notification; error: Error }) => 
      this.emit('notification.error', data));

    this.scheduler.on('notification.scheduled', (notification: Notification) => 
      this.emit('notification.scheduled', notification));

    this.scheduler.on('batch.processing', (data: { size: number }) => 
      this.emit('batch.processing', data));

    this.scheduler.on('batch.completed', (data: { size: number }) => 
      this.emit('batch.completed', data));

    this.dispatcher.on('notification.queued', (notification: Notification) =>
      this.emit('notification.queued', notification));
  }

  /**
   * Get notification engine statistics
   */
  public getStats() {
    return {
      queueStats: this.scheduler.getQueueStats(),
      templates: this.templateManager.getAllTemplates().length,
      scheduledJobs: this.scheduler.getQueueStats(),
    };
  }

  // Type-safe event emitter methods
  public emit<K extends keyof NotificationEventMap>(
    event: K,
    ...args: NotificationEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }

  public on<K extends keyof NotificationEventMap>(
    event: K,
    listener: (...args: NotificationEventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }

  public once<K extends keyof NotificationEventMap>(
    event: K,
    listener: (...args: NotificationEventMap[K]) => void
  ): this {
    return super.once(event, listener);
  }
}