import { ReminderSchedule } from '@/atomic/atoms/database/entities/ReminderSchedule';
import { ReminderFrequency } from '@/atomic/atoms/notification/types';
import { AppDataSource } from '@/config/database';
import { LessThanOrEqual, Repository } from 'typeorm';

export class ReminderScheduleRepository {
  private repository: Repository<ReminderSchedule>;

  constructor() {
    this.repository = AppDataSource.getRepository(ReminderSchedule);
  }

  async createSchedule(
    taskId: string,
    serverId: string,
    frequency: ReminderFrequency,
    nextReminder: Date
  ): Promise<ReminderSchedule> {
    const schedule = this.repository.create({
      taskId,
      serverId,
      frequency,
      nextReminder,
    });
    return this.repository.save(schedule);
  }

  async getSchedule(id: string): Promise<ReminderSchedule | null> {
    return this.repository.findOne({
      where: { id }
    });
  }

  async getScheduleByTask(taskId: string): Promise<ReminderSchedule | null> {
    return this.repository.findOne({
      where: { taskId }
    });
  }

  async updateNextReminder(
    id: string,
    nextReminder: Date
  ): Promise<ReminderSchedule | null> {
    await this.repository.update(id, { nextReminder });
    return this.getSchedule(id);
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteScheduleByTask(taskId: string): Promise<void> {
    await this.repository.delete({ taskId });
  }

  async getDueReminders(serverId: string): Promise<ReminderSchedule[]> {
    return this.repository.find({
      where: {
        serverId,
        nextReminder: LessThanOrEqual(new Date())
      }
    });
  }

  async getAllSchedules(serverId: string): Promise<ReminderSchedule[]> {
    return this.repository.find({
      where: { serverId }
    });
  }
}