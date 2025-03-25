import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { TaskRepository } from '../repositories/TaskRepository';
import { EventBus } from '@/v2/core/EventBus';
import { TaskStatusUpdateResult } from '../../../atoms/task/types';

export class StatusTrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatusTrackingError';
  }
}

export class StatusTrackingService {
  private static instance: StatusTrackingService;

  private constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventBus: EventBus
  ) {}

  public static getInstance(
    taskRepository: TaskRepository,
    eventBus: EventBus
  ): StatusTrackingService {
    if (!StatusTrackingService.instance) {
      StatusTrackingService.instance = new StatusTrackingService(
        taskRepository,
        eventBus
      );
    }
    return StatusTrackingService.instance;
  }

  async updateStatus(
    taskId: string,
    newStatus: TaskStatus,
    serverId: string,
    updatedById: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      if (task.serverId !== serverId) {
        return {
          success: false,
          error: 'Task does not belong to this server',
        };
      }

      const oldStatus = task.status;

      // Update de status
      const updatedTask = await this.taskRepository.update(taskId, {
        status: newStatus,
      });

      // Emit status changed event
      await this.eventBus.emit('task.status.changed', {
        taskId,
        serverId,
        oldStatus,
        newStatus,
        updatedById,
        timestamp: new Date(),
      });

      return {
        success: true,
        task: updatedTask,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async checkOverdueTasks(serverId: string): Promise<void> {
    try {
      const overdueTasks = await this.taskRepository.findOverdueTasks(serverId);

      for (const task of overdueTasks) {
        if (task.status !== TaskStatus.OVERDUE) {
          await this.updateStatus(
            task.id,
            TaskStatus.OVERDUE,
            serverId,
            'SYSTEM'
          );
        }
      }
    } catch (error) {
      throw new StatusTrackingError(
        `Failed to check overdue tasks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async updateBatchStatus(
    taskIds: string[],
    newStatus: TaskStatus,
    serverId: string,
    updatedById: string
  ): Promise<TaskStatusUpdateResult[]> {
    const results: TaskStatusUpdateResult[] = [];

    try {
      for (const taskId of taskIds) {
        const result = await this.updateStatus(
          taskId,
          newStatus,
          serverId,
          updatedById
        );
        results.push({
          success: result.success,
          taskId,
          newStatus,
          error: result.error,
        });
      }
      return results;
    } catch (error) {
      throw new StatusTrackingError(
        `Failed to update batch status: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async autoUpdateTaskStatuses(serverId: string): Promise<void> {
    try {
      const now = new Date();

      // Update overdue tasks
      const overdueTasks = await this.taskRepository.findOverdueTasks(serverId);
      await this.taskRepository.updateTaskStatuses(
        overdueTasks.map((task) => task.id),
        TaskStatus.OVERDUE,
        serverId
      );

      // Emit events for all updated tasks
      for (const task of overdueTasks) {
        await this.eventBus.emit('task.status.changed', {
          taskId: task.id,
          serverId,
          oldStatus: task.status,
          newStatus: TaskStatus.OVERDUE,
          updatedById: 'SYSTEM',
          timestamp: now,
        });
      }
    } catch (error) {
      throw new StatusTrackingError(
        `Failed to auto-update task statuses: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}