import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { EventBus } from '@/v2/core/EventBus';
import { TaskRepository } from '../repositories/TaskRepository';
import { AssignmentService } from './AssignmentService';
import { StatusTrackingService } from './StatusTrackingService';
import { TaskValidationService } from '../../../atoms/task/validation';
import {
  CreateTaskParams,
  UpdateTaskParams,
} from '../../../atoms/task/types';

export class TaskManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskManagementError';
  }
}

export class TaskManagementService {
  private static instance: TaskManagementService;
  private readonly validationService: TaskValidationService;
  private readonly assignmentService: AssignmentService;
  private readonly statusTrackingService: StatusTrackingService;

  private constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventBus: EventBus
  ) {
    this.validationService = TaskValidationService.getInstance();
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
      // Valideer de task parameters
      const validationResult = this.validationService.validateTask(params);
      if (!validationResult.isValid) {
        throw new TaskManagementError(validationResult.errors.join(', '));
      }

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

      // Valideer de update parameters
      const validationResult = this.validationService.validateTaskUpdate(params);
      if (!validationResult.isValid) {
        throw new TaskManagementError(validationResult.errors.join(', '));
      }

      // Update task
      const updatedTask = await this.taskRepository.update(taskId, params);

      // Emit task updated event
      await this.eventBus.emit('task.updated', {
        taskId: task.id,
        serverId,
        changes: params,
        timestamp: new Date(),
      });

      return updatedTask;
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

  // Status Management
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

  // Assignment Management
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

  // Task Queries
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

  // System Maintenance
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