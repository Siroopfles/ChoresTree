import { Task } from '@/atomic/atoms/database/entities/Task';
import { ExtraTemplateData, TaskCreatedEvent, TaskUpdatedEvent } from '@/atomic/atoms/task/types/events';
import { NotificationType, ReminderEvent } from '@/atomic/atoms/notification/types';
import { DatabaseService } from '@/core/database/DatabaseService';
import { EventBus } from '@/core/eventBus';
import { TextChannel } from 'discord.js';
import { TemplateService } from './TemplateService';

export class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class NotificationService {
  private static instance: NotificationService;
  private templateService: TemplateService;
  private retryQueue: Map<string, { attempts: number; lastAttempt: Date }> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconden

  private constructor(private eventBus: EventBus) {
    this.templateService = TemplateService.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(eventBus: EventBus): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(eventBus);
    }
    return NotificationService.instance;
  }

  private setupEventListeners(): void {
    // Luister naar task events
    this.eventBus.on<TaskCreatedEvent>('task.created', async (data) => {
      await this.handleTaskEvent(NotificationType.TASK_CREATED, {
        taskId: data.taskId,
        serverId: data.serverId
      });
    });

    this.eventBus.on<TaskUpdatedEvent>('task.updated', async (data) => {
      await this.handleTaskEvent(NotificationType.TASK_UPDATED, {
        taskId: data.taskId,
        serverId: data.serverId
      });
    });

    this.eventBus.on<ReminderEvent>('reminder.due', async (data) => {
      await this.handleReminderEvent(data);
    });
  }

  async sendNotification(
    channel: TextChannel,
    task: Task,
    type: NotificationType,
    extraData: ExtraTemplateData = {}
  ): Promise<void> {
    try {
      const template = await this.templateService.getTemplate(type, channel.guildId);
      const content = this.formatTemplate(template, task, extraData);

      // Haal notificatie voorkeuren op
      const prefRepo = DatabaseService.getInstance().getNotificationPreferenceRepository();
      const userPrefs = await prefRepo.getEnabledUsers(channel.guildId, type);

      // Voeg mentions toe indien ingeschakeld
      const mentions = userPrefs
        .filter(pref => pref.mentionUser)
        .map(pref => `<@${pref.userId}>`)
        .join(' ');

      const finalContent = mentions ? `${mentions}\n${content}` : content;

      await this.sendWithRetry(channel, finalContent, task.id);
    } catch (error) {
      throw new NotificationError(
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async sendWithRetry(
    channel: TextChannel,
    content: string,
    identifier: string
  ): Promise<void> {
    try {
      await channel.send(content);
      // Als succesvol, verwijder uit retry queue
      this.retryQueue.delete(identifier);
    } catch {
      const queueItem = this.retryQueue.get(identifier) || { attempts: 0, lastAttempt: new Date(0) };
      
      if (queueItem.attempts >= this.MAX_RETRIES) {
        this.retryQueue.delete(identifier);
        throw new NotificationError('Max retry attempts reached');
      }

      const now = new Date();
      if (now.getTime() - queueItem.lastAttempt.getTime() < this.RETRY_DELAY) {
        return; // Wacht tot retry delay voorbij is
      }

      // Update retry info
      this.retryQueue.set(identifier, {
        attempts: queueItem.attempts + 1,
        lastAttempt: now,
      });

      // Schedule retry
      setTimeout(() => {
        this.sendWithRetry(channel, content, identifier).catch(console.error);
      }, this.RETRY_DELAY);
    }
  }

  private formatTemplate(
    template: string,
    task: Task,
    extraData: ExtraTemplateData
  ): string {
    let content = template;

    // Replace task placeholders
    content = content.replace(/{task\.([^}]+)}/g, (_, prop) => {
      return task[prop as keyof Task]?.toString() || '';
    });

    // Replace extra data placeholders
    Object.entries(extraData).forEach(([key, value]) => {
      content = content.replace(
        new RegExp(`{${key}}`, 'g'),
        value?.toString() || ''
      );
    });

    return content;
  }

  private async handleTaskEvent(
    type: NotificationType,
    data: { taskId: string; serverId: string }
  ): Promise<void> {
    try {
      const taskRepo = DatabaseService.getInstance().getTaskRepository();
      const task = await taskRepo.findById(data.taskId);
      
      if (!task) {
        throw new NotificationError('Task not found');
      }

      // TODO: Get notification channel from server settings
      // const channel = await getNotificationChannel(data.serverId);
      // await this.sendNotification(channel, task, type, data);
    } catch (error) {
      console.error(`Error handling ${type} event:`, error);
    }
  }

  private async handleReminderEvent(data: ReminderEvent): Promise<void> {
    try {
      const taskRepo = DatabaseService.getInstance().getTaskRepository();
      const task = await taskRepo.findById(data.taskId);
      
      if (!task) {
        throw new NotificationError('Task not found');
      }

      // TODO: Get notification channel from server settings
      // const channel = await getNotificationChannel(data.serverId);
      // await this.sendNotification(channel, task, NotificationType.REMINDER);
    } catch (error) {
      console.error('Error handling reminder event:', error);
    }
  }
}