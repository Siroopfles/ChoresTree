import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus, TaskPriority } from '@/atomic/atoms/database/interfaces/Task';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { EventBus } from '@/core/eventBus';
import { AssignmentService } from './AssignmentService';
import { StatusTrackingService } from './StatusTrackingService';
import { TaskValidationService } from './TaskValidationService';

export class TaskManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskManagementError';
  }
}

interface CreateTaskParams {
  title: string;
  description: string;
  assigneeId: string;
  serverId: string;
  deadline?: Date;
  priority?: TaskPriority;
  category?: string;
  reminderFrequency?: number;
}

interface UpdateTaskParams {
  title?: string;
  description?: string;
  deadline?: Date;
  priority?: TaskPriority;
  category?: string;
  reminderFrequency?: number;
}

export class TaskManagementService {
  private static instance: TaskManagementService;
  private readonly validationService: TaskValidationService;
  private readonly assignmentService: AssignmentService;
  private readonly statusTrackingService: StatusTrackingService;

  constructor(
    private taskRepository: TaskRepository,
    private eventBus: EventBus
  ) {
    this.validationService = new TaskValidationService();
    this.assignmentService = AssignmentService.getInstance(taskRepository, eventBus);
    this.statusTrackingService = StatusTrackingService.getInstance(
      taskRepository,
      eventBus
    );
  }

  public static getInstance(
    taskRepository: TaskRepository,
    eventBus: EventBus
  ): TaskManagementService {
    if (!TaskManagementService.instance) {
      TaskManagementService.instance = new TaskManagementService(
        taskRepository,
        eventBus
      );
    }
    return TaskManagementService.instance;
  }

  async createTask(params: CreateTaskParams): Promise<Task> {
    try {
      // Valideer de task parameters voordat we hem aanmaken
      await this.validationService.validateTask(params);

      // Maak de task aan met defaults
      const createdTask = await this.taskRepository.createNewTask(params);

      // Emit task created event
      await this.eventBus.emit('task.created', {
        taskId: createdTask.id,
        serverId: params.serverId,
        assigneeId: params.assigneeId,
        timestamp: new Date(),
      });

      return createdTask;
    } catch (error) {
      throw new TaskManagementError(
        `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTask(
    taskId: string,
    params: UpdateTaskParams,
    serverId: string
  ): Promise<Task> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new TaskManagementError('Task not found');
      }

      if (task.serverId !== serverId) {
        throw new TaskManagementError('Task does not belong to this server');
      }

      // Update task properties
      Object.assign(task, params);

      // Valideer de geüpdatete task
      this.validationService.validateTask(task);

      // Sla de wijzigingen op
      await this.taskRepository.update(task.id, params);

      // Emit task updated event
      await this.eventBus.emit('task.updated', {
        taskId: task.id,
        serverId,
        changes: params,
        timestamp: new Date(),
      });

      return task;
    } catch (error) {
      throw new TaskManagementError(
        `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteTask(taskId: string, serverId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new TaskManagementError('Task not found');
      }

      if (task.serverId !== serverId) {
        throw new TaskManagementError('Task does not belong to this server');
      }

      await this.taskRepository.delete(taskId);

      // Emit task deleted event
      await this.eventBus.emit('task.deleted', {
        taskId,
        serverId,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new TaskManagementError(
        `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Status management
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    serverId: string,
    updatedById: string
  ): Promise<Task> {
    const result = await this.statusTrackingService.updateStatus(
      taskId,
      newStatus,
      serverId,
      updatedById
    );

    if (!result.success || !result.task) {
      throw new TaskManagementError(result.error || 'Failed to update task status');
    }

    return result.task;
  }

  // Assignment management
  async assignTask(
    taskId: string,
    assigneeId: string,
    serverId: string
  ): Promise<Task> {
    const result = await this.assignmentService.assignTask(
      taskId,
      assigneeId,
      serverId
    );

    if (!result.success || !result.task) {
      throw new TaskManagementError(result.error || 'Failed to assign task');
    }

    return result.task;
  }

  async unassignTask(taskId: string, serverId: string): Promise<Task> {
    const result = await this.assignmentService.unassignTask(taskId, serverId);

    if (!result.success || !result.task) {
      throw new TaskManagementError(result.error || 'Failed to unassign task');
    }

    return result.task;
  }

  // Task queries
  async getTaskById(taskId: string, serverId: string): Promise<Task | null> {
    const task = await this.taskRepository.findById(taskId);
    if (task && task.serverId !== serverId) {
      return null;
    }
    return task;
  }

  async getTasksByAssignee(
    assigneeId: string,
    serverId: string
  ): Promise<Task[]> {
    return this.taskRepository.findTasksByAssignee(serverId, assigneeId);
  }

  async getPendingTasks(serverId: string): Promise<Task[]> {
    return this.taskRepository.findPendingTasks(serverId);
  }

  async getOverdueTasks(serverId: string): Promise<Task[]> {
    return this.taskRepository.findOverdueTasks(serverId);
  }

  // System maintenance
  async checkAndUpdateOverdueTasks(serverId: string): Promise<void> {
    try {
      await this.statusTrackingService.checkOverdueTasks(serverId);
    } catch (error) {
      throw new TaskManagementError(
        `Failed to check overdue tasks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}