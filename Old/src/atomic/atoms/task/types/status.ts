import { TaskStatus } from '../../database/interfaces/Task';
import { Task } from '../../database/entities/Task';

export interface TaskStatusUpdateResult {
  success: boolean;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  error?: string;
}

// For internal service use
export interface StatusUpdateResult {
  success: boolean;
  task?: Task;
  error?: string;
}