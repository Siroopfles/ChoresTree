import { IBaseEntity, IServerScoped } from './BaseEntity';

export interface ITask extends IBaseEntity, IServerScoped {
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  deadline?: Date;
  completedAt?: Date;
  priority: TaskPriority;
  category?: string;
  reminderFrequency?: number; // in minutes
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
