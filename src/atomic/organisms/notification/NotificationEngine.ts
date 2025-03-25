import { Client as DiscordClient, CommandInteraction } from 'discord.js';
import { EventEmitter } from 'events';
import { EventBus } from '@/core/eventBus';
import { DatabaseService } from '@/core/database/DatabaseService';
import { NotificationDispatcher } from '../../molecules/notification/services/NotificationDispatcher';
import { NotificationScheduler } from '../../molecules/notification/services/NotificationScheduler';
import { TemplateService } from '../../molecules/notification/services/TemplateService';
import { ReminderService } from '../../molecules/notification/services/ReminderService';
import { TaskManagementService } from '../../molecules/task/services/TaskManagementService';
import {
  Notification,
  NotificationTemplate,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  ReminderFrequency,
  RateLimitConfig
} from '../../atoms/notification/types';
import { validateNotification } from '../../atoms/notification/validation';
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
  private readonly templateService: TemplateService;
  private readonly reminderService: ReminderService;

  constructor(
    discordClient: DiscordClient,
    taskService: TaskManagementService,
    private readonly eventBus: EventBus,
    config: NotificationEngineConfig = {}
  ) {
    super();
    // Initialize core services
    this.dispatcher = new NotificationDispatcher(discordClient, config.rateLimits);
    this.templateService = TemplateService.getInstance();
    this.scheduler = new NotificationScheduler(this.dispatcher, taskService);
    this.reminderService = ReminderService.getInstance(this.eventBus);

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
  private applyVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }

  private getDefaultTemplate(templateId: string): string {
    switch (templateId) {
      case 'reminder':
        return '🔔 Reminder\n{taskTitle} moet afgerond worden voor {deadline}';
      case 'task_created':
        return '📝 Nieuwe Taak\n{taskTitle} is aangemaakt en toegewezen aan {assignee}';
      case 'task_updated':
        return '✏️ Taak Bijgewerkt\n{taskTitle} is aangepast: {changes}';
      case 'task_completed':
        return '✅ Taak Voltooid\n{taskTitle} is afgerond door {completedBy}';
      case 'task_overdue':
        return '⚠️ Taak Over Tijd\n{taskTitle} had afgerond moeten zijn voor {deadline}';
      default:
        return '{message}';
    }
  }

  public async registerTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplate> {
    return this.templateService.setTemplate(type, serverId, template);
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
    // Get template
    const template = await this.templateService.getTemplate(
      templateId as NotificationType,
      options.serverId,
      this.getDefaultTemplate(templateId)
    );

    // Apply variables to template
    const content = {
      title: this.applyVariables(template.split('\n')[0], variables),
      message: this.applyVariables(template.split('\n').slice(1).join('\n'), variables)
    };

    // Create notification object
    const notification: Notification = {
      id: crypto.randomUUID(),
      templateId,
      type: templateId as NotificationType,
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
    // Get template
    const template = await this.templateService.getTemplate(
      templateId as NotificationType,
      options.serverId,
      this.getDefaultTemplate(templateId)
    );

    // Apply variables to template
    const content = {
      title: this.applyVariables(template.split('\n')[0], variables),
      message: this.applyVariables(template.split('\n').slice(1).join('\n'), variables)
    };

    // Create notification object
    const notification: Notification = {
      id: crypto.randomUUID(),
      templateId,
      type: templateId as NotificationType,
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

  // Command handlers
  public async handleReminderCommand(
    interaction: CommandInteraction,
    subcommand: string,
    options: Map<string, string | number>
  ): Promise<void> {
    try {
      switch (subcommand) {
        case 'set':
          await this.handleSetReminder(
            interaction,
            options.get('task_id') as string,
            options.get('timing') as string
          );
          break;

        case 'list':
          await this.handleListReminders(
            interaction,
            options.get('task_id') as string
          );
          break;

        case 'delete':
          await this.handleDeleteReminder(
            interaction,
            options.get('reminder_id') as string
          );
          break;

        default:
          await interaction.reply({
            content: 'Ongeldig subcommando.',
            ephemeral: true,
          });
      }
    } catch (error) {
      await interaction.reply({
        content: `Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true,
      });
    }
  }

  public async handleNotificationCommand(
    interaction: CommandInteraction,
    subcommand: string,
    options: Map<string, string>
  ): Promise<void> {
    try {
      switch (subcommand) {
        case 'template':
          await this.handleSetTemplate(
            interaction,
            options.get('type') as NotificationType,
            options.get('template') as string
          );
          break;

        case 'settings':
          await this.handleNotificationSettings(
            interaction,
            options.get('setting') as string,
            options.get('value') as string
          );
          break;

        default:
          await interaction.reply({
            content: 'Ongeldig subcommando.',
            ephemeral: true,
          });
      }
    } catch (error) {
      await interaction.reply({
        content: `Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true,
      });
    }
  }

  private async handleSetReminder(
    interaction: CommandInteraction,
    taskId: string,
    timing: string
  ): Promise<void> {
    // Parse timing string (e.g., "daily 9:00" or "once 2024-03-26 15:30")
    const [frequency, ...timeParts] = timing.split(' ');
    const timeStr = timeParts.join(' ');

    let reminderDate: Date;
    let reminderFreq: ReminderFrequency;

    switch (frequency.toLowerCase()) {
      case 'once':
        reminderFreq = ReminderFrequency.ONCE;
        reminderDate = new Date(timeStr);
        break;
      
      case 'daily':
        reminderFreq = ReminderFrequency.DAILY;
        const [hours, minutes] = timeStr.split(':').map(Number);
        reminderDate = new Date();
        reminderDate.setHours(hours, minutes, 0, 0);
        break;
      
      case 'weekly':
        reminderFreq = ReminderFrequency.WEEKLY;
        const [dayOfWeek, time] = timeStr.split(' ');
        reminderDate = this.getNextDayOfWeek(dayOfWeek, time);
        break;
      
      default:
        await interaction.reply({
          content: 'Ongeldige frequentie. Gebruik "once", "daily" of "weekly".',
          ephemeral: true,
        });
        return;
    }

    if (isNaN(reminderDate.getTime())) {
      await interaction.reply({
        content: 'Ongeldige datum/tijd formaat.',
        ephemeral: true,
      });
      return;
    }

    // Voeg reminder toe
    await this.reminderService.setReminder(
      taskId,
      interaction.guildId!,
      reminderFreq,
      reminderDate
    );

    await interaction.reply({
      content: `Reminder ingesteld voor taak ${taskId}`,
      ephemeral: true,
    });
  }

  private async handleListReminders(
    interaction: CommandInteraction,
    taskId?: string
  ): Promise<void> {
    if (taskId) {
      const reminder = await this.reminderService.getReminder(taskId);
      if (!reminder) {
        await interaction.reply({
          content: 'Geen reminders gevonden voor deze taak.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Reminder voor taak ${taskId}:\nVolgende herinnering: ${reminder.nextReminder.toLocaleString('nl-NL')}\nFrequentie: ${reminder.frequency}`,
        ephemeral: true,
      });
    } else {
      // TODO: Implementeer alle reminders weergeven
      await interaction.reply({
        content: 'Nog niet geïmplementeerd.',
        ephemeral: true,
      });
    }
  }

  private async handleDeleteReminder(
    interaction: CommandInteraction,
    taskId: string
  ): Promise<void> {
    await this.reminderService.deleteReminder(taskId);
    await interaction.reply({
      content: `Reminder verwijderd voor taak ${taskId}`,
      ephemeral: true,
    });
  }

  private async handleSetTemplate(
    interaction: CommandInteraction,
    type: NotificationType,
    template: string
  ): Promise<void> {
    await this.templateService.setTemplate(type, interaction.guildId!, template);
    await interaction.reply({
      content: `Template voor ${type} is bijgewerkt.`,
      ephemeral: true,
    });
  }

  private async handleNotificationSettings(
    interaction: CommandInteraction,
    setting: string,
    value: string
  ): Promise<void> {
    // Voorlopige implementatie voor basis notificatie instellingen
    switch (setting.toLowerCase()) {
      case 'mentions':
        // Update mention preference
        const prefRepo = DatabaseService.getInstance().getNotificationPreferenceRepository();
        await prefRepo.updatePreference(
          interaction.user.id,
          interaction.guildId!,
          NotificationType.REMINDER,
          {
            mentionUser: value.toLowerCase() === 'true'
          }
        );
        await interaction.reply({
          content: `Mentions ${value.toLowerCase() === 'true' ? 'ingeschakeld' : 'uitgeschakeld'} voor reminders.`,
          ephemeral: true,
        });
        break;

      default:
        await interaction.reply({
          content: `Ongeldige instelling: ${setting}. Beschikbare instellingen: mentions`,
          ephemeral: true,
        });
    }
  }

  private getNextDayOfWeek(dayName: string, time: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const targetDay = days.indexOf(dayName.toLowerCase());
    if (targetDay === -1) throw new Error('Ongeldige dag');

    const result = new Date();
    result.setDate(
      result.getDate() + ((targetDay + 7 - result.getDay()) % 7)
    );
    result.setHours(hours, minutes, 0, 0);

    // Als het tijdstip vandaag al voorbij is en het is de doeldag, ga naar volgende week
    if (
      result.getDay() === today.getDay() &&
      (result.getHours() < today.getHours() ||
        (result.getHours() === today.getHours() &&
          result.getMinutes() <= today.getMinutes()))
    ) {
      result.setDate(result.getDate() + 7);
    }

    return result;
  }
}