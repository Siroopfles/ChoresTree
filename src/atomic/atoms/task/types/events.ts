import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

// Base event interface
export interface TaskEvent {
  taskId: string;
  serverId: string;
  timestamp: Date;
}

// Task management events
export interface TaskCreatedEvent extends TaskEvent {
  assigneeId: string;
}

export interface TaskUpdatedEvent extends TaskEvent {
  changes: Record<string, string | number | boolean | Date | null>;
}

export interface TaskStatusUpdatedEvent extends TaskEvent {
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  updatedById: string;
}

export interface TaskAssignedEvent extends TaskEvent {
  assigneeId: string;
}

export interface TaskUnassignedEvent extends TaskEvent {
  previousAssignee: string;
}

export interface TaskReassignedEvent extends TaskEvent {
  previousAssignee: string;
  newAssigneeId: string;
}

export interface TaskCompletedEvent extends TaskEvent {
  completedBy: string;
}

// Template-specific data interface
export interface ExtraTemplateData {
  completedBy?: string;
  changes?: string;
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  assigneeId?: string;
  [key: string]: string | TaskStatus | undefined;
}