import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../core/database/base/BaseEntity';
import { TaskEntity } from './TaskEntity';

/**
 * Notification entity representing a scheduled reminder for a task
 * Supports recurring notifications and different notification types
 */
@Entity('notifications')
export class NotificationEntity extends BaseEntity {
  @Column({ name: 'type' })
  type: 'REMINDER' | 'DUE_DATE' | 'ASSIGNMENT' | 'STATUS_UPDATE';

  @Column({ name: 'status', default: 'PENDING' })
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ name: 'channel_id' })
  channelId: string;

  @Column({ name: 'target_user_id', nullable: true })
  targetUserId?: string;

  @Column({ name: 'target_role_id', nullable: true })
  targetRoleId?: string;

  // Recurring notification settings
  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_pattern', nullable: true })
  recurrencePattern?: string;

  @Column({ name: 'recurrence_end_date', type: 'timestamptz', nullable: true })
  recurrenceEndDate?: Date;

  // Custom message template
  @Column({ name: 'custom_message', type: 'text', nullable: true })
  customMessage?: string;

  // Failed notification tracking
  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  // Relatie met Task
  @ManyToOne(() => TaskEntity, { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @Column({ name: 'task_id' })
  taskId: string;

  // Helper methods
  /**
   * Check if notification is due for sending
   */
  isDue(): boolean {
    return new Date() >= this.scheduledFor;
  }

  /**
   * Check if notification can still be retried
   */
  canRetry(): boolean {
    return this.status === 'FAILED' && this.retryCount < 3;
  }

  /**
   * Get time until scheduled sending
   */
  getTimeUntilScheduled(): number {
    return this.scheduledFor.getTime() - Date.now();
  }

  /**
   * Check if recurrence is still active
   */
  isRecurrenceActive(): boolean {
    if (!this.isRecurring) return false;
    if (!this.recurrenceEndDate) return true;
    return new Date() <= this.recurrenceEndDate;
  }
}