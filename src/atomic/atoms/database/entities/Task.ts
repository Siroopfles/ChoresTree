import { Entity, Column, Index } from 'typeorm';
import { ServerScopedEntity } from './BaseEntity';
import { ITask, TaskStatus, TaskPriority } from '../interfaces/Task';

@Entity('tasks')
@Index(['serverId', 'status']) // Voor snelle queries op taken per server/status
@Index(['serverId', 'deadline']) // Voor deadline checks en reminders
export class Task extends ServerScopedEntity implements ITask {
  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  assigneeId: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  deadline?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  completedAt?: Date;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({
    nullable: true,
  })
  category?: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  reminderFrequency?: number;

  // Methods voor business logic
  isOverdue(): boolean {
    if (!this.deadline) return false;
    return new Date() > this.deadline && this.status !== TaskStatus.COMPLETED;
  }

  shouldSendReminder(lastReminderSent: Date): boolean {
    if (!this.reminderFrequency || this.status === TaskStatus.COMPLETED) {
      return false;
    }

    const nextReminderDue = new Date(lastReminderSent);
    nextReminderDue.setMinutes(nextReminderDue.getMinutes() + this.reminderFrequency);

    return new Date() >= nextReminderDue;
  }
}
