import { Task } from '@/atomic/atoms/database/entities/Task';
import { CreateTaskParams, UpdateTaskParams } from '../../../atoms/task/types';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

export interface TaskRepository {
  // Core CRUD operations
  createNewTask(params: CreateTaskParams): Promise<Task>;
  findById(taskId: string): Promise<Task | null>;
  update(taskId: string, params: UpdateTaskParams): Promise<Task>;
  delete(taskId: string): Promise<void>;

  // Query operations
  findTasksByAssignee(serverId: string, assigneeId: string): Promise<Task[]>;
  findPendingTasks(serverId: string): Promise<Task[]>;
  findOverdueTasks(serverId: string): Promise<Task[]>;
  findTasksByStatus(serverId: string, status: TaskStatus): Promise<Task[]>;
  
  // Batch operations
  updateTaskStatuses(
    taskIds: string[],
    status: TaskStatus,
    serverId: string
  ): Promise<void>;
  
  // Server specific operations
  findTasksByServer(serverId: string): Promise<Task[]>;
  deleteServerTasks(serverId: string): Promise<void>;
  
  // Maintenance operations
  archiveCompletedTasks(olderThan: Date): Promise<void>;
  cleanupOrphanedTasks(): Promise<void>;
}