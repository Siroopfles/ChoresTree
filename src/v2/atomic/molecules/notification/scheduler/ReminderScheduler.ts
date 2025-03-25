import { EventBus } from '@/core/eventBus';
import { DatabaseService } from '@/core/database/DatabaseService';
import { ReminderEvent } from '../../../atoms/notification/types/events';
import { ReminderFrequency } from '../../../atoms/notification/types/enums';

export class ReminderSchedulerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReminderSchedulerError';
  }
}

export class ReminderScheduler {
  private static instance: ReminderScheduler;
  private scheduledReminders: Map<string, NodeJS.Timeout> = new Map();
  private readonly CHECK_INTERVAL = 60000; // 1 minute

  private constructor(private eventBus: EventBus) {
    this.startScheduler();
  }

  public static getInstance(eventBus: EventBus): ReminderScheduler {
    if (!ReminderScheduler.instance) {
      ReminderScheduler.instance = new ReminderScheduler(eventBus);
    }
    return ReminderScheduler.instance;
  }

  private startScheduler(): void {
    setInterval(() => {
      this.checkReminders().catch(console.error);
    }, this.CHECK_INTERVAL);
  }

  private async checkReminders(): Promise<void> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      const serverId = 'global'; // TODO: Implement multi-server support
      const dueReminders = await repository.getDueReminders(serverId);

      for (const reminder of dueReminders) {
        // Emit reminder event
        const event: ReminderEvent = {
          taskId: reminder.taskId,
          scheduleId: reminder.id,
          serverId: reminder.serverId,
          timestamp: new Date()
        };

        this.eventBus.emit('reminder.due', event);

        // Update next reminder time based on frequency
        if (reminder.frequency !== ReminderFrequency.ONCE) {
          const nextReminder = this.calculateNextReminderTime(new Date(), reminder.frequency);
          await repository.updateNextReminder(reminder.id, nextReminder);
        } else {
          // Delete one-time reminders after they're triggered
          await repository.deleteSchedule(reminder.id);
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  private calculateNextReminderTime(from: Date, frequency: ReminderFrequency): Date {
    const next = new Date(from);
    
    switch (frequency) {
      case ReminderFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ReminderFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      default:
        throw new ReminderSchedulerError(`Invalid reminder frequency: ${frequency}`);
    }

    return next;
  }

  public async scheduleReminder(
    taskId: string,
    serverId: string,
    scheduledFor: Date,
    frequency: ReminderFrequency = ReminderFrequency.ONCE
  ): Promise<void> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      await repository.createSchedule(taskId, serverId, frequency, scheduledFor);
    } catch (error) {
      throw new ReminderSchedulerError(
        `Failed to schedule reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async cancelReminder(taskId: string): Promise<void> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      await repository.deleteScheduleByTask(taskId);
    } catch (error) {
      throw new ReminderSchedulerError(
        `Failed to cancel reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}