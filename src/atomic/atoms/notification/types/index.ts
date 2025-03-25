import { Task } from '@/atomic/atoms/database/entities/Task';

export enum NotificationType {
  REMINDER = 'reminder',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
}

export enum ReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  serverId: string;
  template: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderSchedule {
  id: string;
  taskId: string;
  serverId: string;
  frequency: ReminderFrequency;
  nextReminder: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  serverId: string;
  type: NotificationType;
  enabled: boolean;
  mentionUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationEvent {
  type: NotificationType;
  task: Task;
  serverId: string;
  timestamp: Date;
}

export interface ReminderEvent {
  taskId: string;
  scheduleId: string;
  serverId: string;
  timestamp: Date;
}