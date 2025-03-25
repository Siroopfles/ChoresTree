import { TaskPriority } from '@/atomic/atoms/database/interfaces/Task';
import { TaskStatus } from './status';
export { TaskStatus } from './status';

// Base task interfaces
export interface TaskData {
  title: string;
  description: string;
  assigneeId: string;
  serverId: string;
  deadline?: Date;
  priority?: TaskPriority;
  category?: string;
  reminderFrequency?: number;
}

// Operation results
export interface TaskValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TaskAssignmentResult {
  success: boolean;
  taskId: string;
  assigneeId: string;
  error?: string;
}

export interface TaskStatusUpdateResult {
  success: boolean;
  taskId: string;
  newStatus: TaskStatus;
  error?: string;
}

// Operation parameters
export interface CreateTaskParams extends TaskData {}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  deadline?: Date;
  priority?: TaskPriority;
  category?: string;
  reminderFrequency?: number;
  assigneeId?: string;
  status?: TaskStatus;
}

// Event payloads
export interface TaskCreatedEvent {
  taskId: string;
  serverId: string;
  assigneeId: string;
  timestamp: Date;
}

export interface TaskUpdatedEvent {
  taskId: string;
  serverId: string;
  changes: UpdateTaskParams;
  timestamp: Date;
}

export interface TaskDeletedEvent {
  taskId: string;
  serverId: string;
  timestamp: Date;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  serverId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  updatedById: string;
  timestamp: Date;
}

export interface TaskAssignmentChangedEvent {
  taskId: string;
  serverId: string;
  oldAssigneeId?: string;
  newAssigneeId?: string;
  timestamp: Date;
}