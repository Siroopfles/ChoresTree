import { TextChannel } from 'discord.js';
import { EventBus } from '@/core/eventBus';
import { DatabaseService } from '@/core/database/DatabaseService';
import { NotificationType, NotificationPriority, NotificationStatus } from '../../../atoms/notification/types/enums';
import { NotificationFormatter } from '../../../atoms/notification/formatter/NotificationFormatter';
import { TemplateService } from '../../../molecules/notification/services/TemplateService';
import { NotificationDispatcher } from '../../../molecules/notification/services/NotificationDispatcher';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { ExtraTemplateData, TaskEvent } from '../../../atoms/notification/types/events';
import { ReminderEvent } from '../../../atoms/notification/types/events';
import { mapToLegacyNotificationType } from '../../../atoms/notification/types/compatibility';

export class NotificationEventHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationEventHandlerError';
  }
}

export class NotificationEventHandler {
  private static instance: NotificationEventHandler;
  private templateService: TemplateService;
  private dispatcher: NotificationDispatcher;

  private constructor(private eventBus: EventBus) {
    this.templateService = TemplateService.getInstance();
    this.dispatcher = NotificationDispatcher.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(eventBus: EventBus): NotificationEventHandler {
    if (!NotificationEventHandler.instance) {
      NotificationEventHandler.instance = new NotificationEventHandler(eventBus);
    }
    return NotificationEventHandler.instance;
  }

  private setupEventListeners(): void {
    // Task events
    this.eventBus.on<TaskEvent>('task.created', async (data) => {
      await this.handleTaskEvent(NotificationType.TASK_CREATED, data);
    });

    this.eventBus.on<TaskEvent>('task.updated', async (data) => {
      await this.handleTaskEvent(NotificationType.TASK_UPDATED, data);
    });

    this.eventBus.on<TaskEvent>('task.completed', async (data) => {
      await this.handleTaskEvent(NotificationType.TASK_COMPLETED, data);
    });

    this.eventBus.on<TaskEvent>('task.assigned', async (data) => {
      await this.handleTaskEvent(NotificationType.TASK_ASSIGNED, data);
    });

    // Reminder events
    this.eventBus.on<ReminderEvent>('reminder.due', async (data) => {
      await this.handleReminderEvent(data);
    });
  }

  private async handleTaskEvent(
    type: NotificationType,
    data: TaskEvent
  ): Promise<void> {
    try {
      const task = await this.getTask(data.taskId);
      const channel = await this.getNotificationChannel(data.serverId);
      
      if (!channel) {
        throw new NotificationEventHandlerError('Notification channel not found');
      }

      await this.sendNotification(channel, task, type, data.extraData || {});
    } catch (error) {
      console.error(`Error handling ${type} event:`, error);
    }
  }

  private async handleReminderEvent(data: ReminderEvent): Promise<void> {
    try {
      const task = await this.getTask(data.taskId);
      const channel = await this.getNotificationChannel(data.serverId);
      
      if (!channel) {
        throw new NotificationEventHandlerError('Notification channel not found');
      }

      await this.sendNotification(channel, task, NotificationType.TASK_REMINDER);
    } catch (error) {
      console.error('Error handling reminder event:', error);
    }
  }

  private async sendNotification(
    channel: TextChannel,
    task: Task,
    type: NotificationType,
    extraData: ExtraTemplateData = {}
  ): Promise<void> {
    try {
      // Get template and format content
      const template = await this.templateService.getTemplate(type, channel.guildId);
      const content = NotificationFormatter.format(template, task, extraData);

      // Get user notification preferences
      const prefRepo = DatabaseService.getInstance().getNotificationPreferenceRepository();
      const legacyType = mapToLegacyNotificationType(type);
      const userPrefs = await prefRepo.getEnabledUsers(channel.guildId, legacyType);

      // Add mentions for users who enabled them
      const mentionUserIds = userPrefs
        .filter(pref => pref.mentionUser)
        .map(pref => pref.userId);

      const finalContent = NotificationFormatter.addMentions(content, mentionUserIds);

      // Create notification queue item
      const queueId = `${type}-${task.id}-${Date.now()}`;
      const notification = {
        id: queueId,
        serverId: channel.guildId,
        notifications: [{
          id: `${queueId}-0`,
          templateId: template,
          type,
          priority: NotificationPriority.MEDIUM,
          status: NotificationStatus.PENDING,
          recipientId: channel.id,
          serverId: channel.guildId,
          content: { title: '', message: finalContent },
          variables: Object.fromEntries(
            Object.entries(extraData).filter((entry) => entry[1] !== undefined)
          ),
          createdAt: new Date(),
          scheduledFor: new Date(),
          retryCount: 0,
          maxRetries: 3
        }],
        metadata: {
          totalCount: 1,
          processedCount: 0,
          failedCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Dispatch notification
      await this.dispatcher.dispatch(channel, finalContent, queueId, notification);
    } catch (error) {
      throw new NotificationEventHandlerError(
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getTask(taskId: string): Promise<Task> {
    const taskRepo = DatabaseService.getInstance().getTaskRepository();
    const task = await taskRepo.findById(taskId);
    
    if (!task) {
      throw new NotificationEventHandlerError('Task not found');
    }

    return task;
  }

  private async getNotificationChannel(serverId: string): Promise<TextChannel | null> {
    try {
      const settingsRepo = DatabaseService.getInstance().getServerSettingsRepository();
      const settings = await settingsRepo.getServerSettings(serverId);

      if (!settings?.notificationChannelId) {
        return null;
      }

      // TODO: Use Discord.js client to get channel
      // const channel = await client.channels.fetch(settings.notificationChannelId);
      // return channel instanceof TextChannel ? channel : null;
      
      return null;
    } catch (error) {
      console.error('Error getting notification channel:', error);
      return null;
    }
  }
}