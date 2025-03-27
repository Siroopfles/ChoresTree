import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../core/database/base/BaseEntity';
import { TaskEntity } from './TaskEntity';

export type NotificationType = 'DEADLINE' | 'ASSIGNMENT' | 'STATUS_CHANGE' | 'REMINDER';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

/**
 * Notification entity for task-related notifications
 * Handles scheduling and delivery of notifications
 */
@Entity('notifications')
export class NotificationEntity extends BaseEntity {
  @Column({ name: 'type' })
  type: NotificationType;

  @Column({ name: 'status', default: 'PENDING' })
  status: NotificationStatus;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'custom_message', type: 'text', nullable: true })
  customMessage?: string;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'channel_id' })
  channelId: string;

  @Column({ name: 'target_user_id', nullable: true })
  targetUserId?: string;

  @Column({ name: 'target_role_id', nullable: true })
  targetRoleId?: string;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_pattern', nullable: true })
  recurrencePattern?: string;

  @Column({ name: 'recurrence_end_date', type: 'timestamptz', nullable: true })
  recurrenceEndDate?: Date;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  // Relatie met Task
  @ManyToOne(() => TaskEntity, task => task.notifications, { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @Column({ name: 'task_id' })
  taskId: string;

  /**
   * Mark notification as delivered
   */
  markDelivered() {
    this.deliveredAt = new Date();
    this.status = 'SENT';
  }

  /**
   * Check if notification can be retried
   */
  canRetry(): boolean {
    return this.status === 'FAILED' && this.retryCount < 3;
  }

  /**
   * Check if notification is due for sending
   */
  isDue(): boolean {
    return !this.deliveredAt && this.scheduledFor <= new Date();
  }

  /**
   * Get time until scheduled delivery
   */
  getTimeUntilScheduled(): number {
    return this.scheduledFor.getTime() - Date.now();
  }

  /**
   * Check if recurring schedule is still active
   */
  isRecurrenceActive(): boolean {
    if (!this.isRecurring) return false;
    if (!this.recurrenceEndDate) return true;
    return this.recurrenceEndDate > new Date();
  }
}