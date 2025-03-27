import { ReminderSchedule } from '@/atomic/atoms/database/entities/ReminderSchedule';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { ReminderEvent, ReminderFrequency } from '@/atomic/atoms/notification/types';
import { DatabaseService } from '@/core/database/DatabaseService';
import { EventBus } from '@/core/eventBus';

export class ReminderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReminderError';
  }
}

export class ReminderService {
  private static instance: ReminderService;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor(private eventBus: EventBus) {
    // Start de reminder checker
    this.startReminderChecker();
  }

  public static getInstance(eventBus: EventBus): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService(eventBus);
    }
    return ReminderService.instance;
  }

  async setReminder(
    taskId: string,
    serverId: string,
    frequency: ReminderFrequency,
    firstReminder: Date
  ): Promise<ReminderSchedule> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      const taskRepo = DatabaseService.getInstance().getTaskRepository();

      // Controleer of de task bestaat
      const task: Task | null = await taskRepo.findById(taskId);
      if (!task) {
        throw new ReminderError('Task not found');
      }

      // Verwijder bestaande reminder als die er is
      const existing = await repository.getScheduleByTask(taskId);
      if (existing) {
        await repository.deleteSchedule(existing.id);
      }

      // Maak nieuwe reminder aan
      return repository.createSchedule(
        taskId,
        serverId,
        frequency,
        firstReminder
      );
    } catch (error) {
      throw new ReminderError(
        `Failed to set reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteReminder(taskId: string): Promise<void> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      await repository.deleteScheduleByTask(taskId);
    } catch (error) {
      throw new ReminderError(
        `Failed to delete reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getReminder(taskId: string): Promise<ReminderSchedule | null> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      return repository.getScheduleByTask(taskId);
    } catch (error) {
      throw new ReminderError(
        `Failed to get reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private startReminderChecker(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check elke minuut voor due reminders
    this.checkInterval = setInterval(() => this.checkDueReminders(), 60000);
  }

  private async checkDueReminders(): Promise<void> {
    try {
      const repository = DatabaseService.getInstance().getReminderScheduleRepository();
      const taskRepo = DatabaseService.getInstance().getTaskRepository();

      // Get alle due reminders
      const dueReminders = await repository.getDueReminders('');

      for (const reminder of dueReminders) {
        const task: Task | null = await taskRepo.findById(reminder.taskId);
        if (!task) {
          // Als task niet meer bestaat, verwijder reminder
          await repository.deleteSchedule(reminder.id);
          continue;
        }

        // Emit reminder event
        const reminderEvent: ReminderEvent = {
          taskId: reminder.taskId,
          scheduleId: reminder.id,
          serverId: reminder.serverId,
          timestamp: new Date(),
        };
        await this.eventBus.emit('reminder.due', reminderEvent);

        // Update next reminder based on frequency
        const nextReminder = this.calculateNextReminder(reminder);
        if (nextReminder) {
          await repository.updateNextReminder(reminder.id, nextReminder);
        } else {
          // Als er geen volgende reminder is (bij ONCE), verwijder schedule
          await repository.deleteSchedule(reminder.id);
        }
      }
    } catch (error) {
      console.error('Error checking due reminders:', error);
    }
  }

  private calculateNextReminder(reminder: ReminderSchedule): Date | null {
    const now = new Date();
    switch (reminder.frequency) {
      case ReminderFrequency.ONCE:
        return null;
      
      case ReminderFrequency.DAILY:
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(reminder.nextReminder.getHours());
        tomorrow.setMinutes(reminder.nextReminder.getMinutes());
        return tomorrow;
      
      case ReminderFrequency.WEEKLY:
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(reminder.nextReminder.getHours());
        nextWeek.setMinutes(reminder.nextReminder.getMinutes());
        return nextWeek;
      
      default:
        return null;
    }
  }

  public cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}