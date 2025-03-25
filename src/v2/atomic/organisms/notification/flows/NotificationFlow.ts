import { EventBus } from '@/core/eventBus';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { NotificationDispatcher } from '../dispatcher/NotificationDispatcher';
import { TemplateService } from '../../../molecules/notification/services/TemplateService';
import { ReminderScheduler } from '../../../molecules/notification/scheduler/ReminderScheduler';
import { NotificationType, NotificationPriority, NotificationStatus, ReminderFrequency } from '../../../atoms/notification/types/enums';
import { NotificationFormatter } from '../../../atoms/notification/formatter/NotificationFormatter';
import { ExtraTemplateData } from '../../../atoms/notification/types/events';
import { TextChannel } from 'discord.js';

export class NotificationFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationFlowError';
  }
}

export class NotificationFlow {
  private static instance: NotificationFlow;
  private templateService: TemplateService;
  private dispatcher: NotificationDispatcher;
  private scheduler: ReminderScheduler;

  private constructor(private eventBus: EventBus) {
    this.templateService = TemplateService.getInstance();
    this.dispatcher = NotificationDispatcher.getInstance();
    this.scheduler = ReminderScheduler.getInstance(eventBus);
  }

  public static getInstance(eventBus: EventBus): NotificationFlow {
    if (!NotificationFlow.instance) {
      NotificationFlow.instance = new NotificationFlow(eventBus);
    }
    return NotificationFlow.instance;
  }

  /**
   * Schedule a task reminder
   */
  async scheduleTaskReminder(
    task: Task,
    channel: TextChannel,
    scheduledFor: Date,
    frequency: ReminderFrequency = ReminderFrequency.ONCE
  ): Promise<void> {
    try {
      // Schedule the reminder
      await this.scheduler.scheduleReminder(
        task.id,
        channel.guildId,
        scheduledFor,
        frequency
      );

      // Send immediate confirmation
      await this.sendTaskNotification(
        task,
        channel,
        NotificationType.TASK_REMINDER,
        {
          scheduledFor: scheduledFor.toISOString(),
          frequency: frequency.toString()
        },
        NotificationPriority.LOW
      );
    } catch (error) {
      throw new NotificationFlowError(
        `Failed to schedule reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel all reminders for a task
   */
  async cancelTaskReminders(task: Task, channel: TextChannel): Promise<void> {
    try {
      await this.scheduler.cancelReminder(task.id);
      
      // Send cancellation confirmation
      await this.sendTaskNotification(
        task,
        channel,
        NotificationType.SYSTEM_ALERT,
        { message: 'All reminders cancelled' },
        NotificationPriority.LOW
      );
    } catch (error) {
      throw new NotificationFlowError(
        `Failed to cancel reminders: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send a task-related notification
   */
  async sendTaskNotification(
    task: Task,
    channel: TextChannel,
    type: NotificationType,
    extraData: ExtraTemplateData = {},
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<void> {
    try {
      // Get and format template
      const template = await this.templateService.getTemplate(type, channel.guildId);
      const content = NotificationFormatter.format(template, task, extraData);

      // Create notification queue item
      const queueId = `${type}-${task.id}-${Date.now()}`;
      const notification = {
        id: queueId,
        serverId: channel.guildId,
        notifications: [{
          id: `${queueId}-0`,
          templateId: template,
          type,
          priority,
          status: NotificationStatus.PENDING,
          recipientId: channel.id,
          serverId: channel.guildId,
          content: { title: '', message: content },
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
      await this.dispatcher.dispatch(channel, content, queueId, notification);
    } catch (error) {
      throw new NotificationFlowError(
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}