import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskRepository } from '../repositories/TaskRepository';
import { EventBus } from '@/v2/core/EventBus';
import { TaskAssignmentResult } from '../../../atoms/task/types';

export class AssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssignmentError';
  }
}

export class AssignmentService {
  private static instance: AssignmentService;

  private constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventBus: EventBus
  ) {}

  public static getInstance(
    taskRepository: TaskRepository,
    eventBus: EventBus
  ): AssignmentService {
    if (!AssignmentService.instance) {
      AssignmentService.instance = new AssignmentService(taskRepository, eventBus);
    }
    return AssignmentService.instance;
  }

  async assignTask(
    taskId: string,
    newAssigneeId: string,
    serverId: string
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

      const oldAssigneeId = task.assigneeId;
      task.assigneeId = newAssigneeId;

      const updatedTask = await this.taskRepository.update(taskId, {
        assigneeId: newAssigneeId,
      });

      // Emit assignment changed event
      await this.eventBus.emit('task.assignment.changed', {
        taskId,
        serverId,
        oldAssigneeId,
        newAssigneeId,
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

  async unassignTask(
    taskId: string,
    serverId: string
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

      const oldAssigneeId = task.assigneeId;
      task.assigneeId = ''; // Unassign by setting empty assigneeId

      const updatedTask = await this.taskRepository.update(taskId, {
        assigneeId: '',
      });

      // Emit assignment changed event
      await this.eventBus.emit('task.assignment.changed', {
        taskId,
        serverId,
        oldAssigneeId,
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

  async reassignTasks(
    oldAssigneeId: string,
    newAssigneeId: string,
    serverId: string
  ): Promise<TaskAssignmentResult[]> {
    try {
      const tasks = await this.taskRepository.findTasksByAssignee(
        serverId,
        oldAssigneeId
      );

      const results: TaskAssignmentResult[] = [];

      for (const task of tasks) {
        const result = await this.assignTask(task.id, newAssigneeId, serverId);
        results.push({
          success: result.success,
          taskId: task.id,
          assigneeId: newAssigneeId,
          error: result.error,
        });
      }

      return results;
    } catch (error) {
      throw new AssignmentError(
        `Failed to reassign tasks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}