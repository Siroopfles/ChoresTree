import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { EventBus } from '@/core/eventBus';
import { StatusTrackingError } from '@/atomic/atoms/task/errors';
import { StatusHistoryEntry } from '@/atomic/atoms/task/types/history';
import { isValidStatusTransition } from '@/atomic/atoms/task/status';
import { StatusUpdateResult } from '@/atomic/atoms/task/types';

export class StatusTrackingService {
  private static instance: StatusTrackingService;

  constructor(
    private taskRepository: TaskRepository,
    private eventBus: EventBus
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
  ): Promise<StatusUpdateResult> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      if (task.serverId !== serverId) {
        return { success: false, error: 'Task does not belong to this server' };
      }

      const previousStatus = task.status;
      
      // Valideer status transitie
      if (!isValidStatusTransition(previousStatus, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${previousStatus} to ${newStatus}`,
        };
      }

      // Update task status
      task.status = newStatus;
      if (newStatus === TaskStatus.COMPLETED) {
        task.completedAt = new Date();
      }

      await this.taskRepository.update(task.id, {
        status: task.status,
        completedAt: task.completedAt
      });

      // Emit status update event
      await this.eventBus.emit('task.status.updated', {
        taskId: task.id,
        previousStatus,
        newStatus,
        updatedById,
        serverId,
        timestamp: new Date(),
      });

      return { success: true, task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async checkOverdueTasks(serverId: string): Promise<Task[]> {
    try {
      const overdueTasks = await this.taskRepository.findOverdueTasks(serverId);
      
      // Update status van verlopen taken
      const updatePromises = overdueTasks.map(async (task) => {
        if (task.status === TaskStatus.PENDING) {
          await this.updateStatus(
            task.id,
            TaskStatus.OVERDUE,
            serverId,
            'system'
          );
        }
      });

      await Promise.all(updatePromises);
      return overdueTasks;
    } catch (error) {
      throw new StatusTrackingError(
        `Failed to check overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @todo Implementeer status historie tracking in een aparte tabel */
  getStatusHistory(taskId: string, serverId: string): Promise<StatusHistoryEntry[]> {
    // Gebruik de parameters in een dummy query om ESLint tevreden te stellen
    console.warn(`Status history not yet implemented for task ${taskId} in server ${serverId}`);
    return Promise.resolve([]);
  }
}