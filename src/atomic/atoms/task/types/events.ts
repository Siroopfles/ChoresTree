import { TaskStatus } from '../../database/interfaces/Task';

export interface TaskEvent {
  taskId: string;
  serverId: string;
  timestamp: Date;
}

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