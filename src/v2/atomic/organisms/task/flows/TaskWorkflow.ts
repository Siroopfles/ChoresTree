import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { EventBus } from '@/v2/core/EventBus';
import {
  TaskManagementService,
  CreateTaskParams,
  UpdateTaskParams,
} from '../../../molecules/task';

export class TaskWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskWorkflowError';
  }
}

/**
 * TaskWorkflow orchestreert complexe taakbeheer operaties die meerdere services gebruiken
 */
export class TaskWorkflow {
  private static instance: TaskWorkflow;

  private constructor(
    private readonly taskManagementService: TaskManagementService,
    private readonly eventBus: EventBus
  ) {}

  public static getInstance(
    taskManagementService: TaskManagementService,
    eventBus: EventBus
  ): TaskWorkflow {
    if (!TaskWorkflow.instance) {
      TaskWorkflow.instance = new TaskWorkflow(taskManagementService, eventBus);
    }
    return TaskWorkflow.instance;
  }

  /**
   * Creëer een nieuwe taak en start de bijbehorende workflow
   */
  async createTaskWithWorkflow(params: CreateTaskParams): Promise<Task> {
    try {
      // Maak de taak aan
      const task = await this.taskManagementService.createTask(params);

      // Start notificatie workflow
      await this.eventBus.emit('workflow.task.created', {
        taskId: task.id,
        serverId: params.serverId,
        assigneeId: params.assigneeId,
        deadline: params.deadline,
        priority: params.priority,
        timestamp: new Date(),
      });

      return task;
    } catch (error) {
      throw new TaskWorkflowError(
        `Failed to create task workflow: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Handel taakvoortgang af inclusief notificaties en deadlines
   */
  async progressTask(
    taskId: string,
    newStatus: TaskStatus,
    serverId: string,
    updatedById: string,
    comment?: string
  ): Promise<Task> {
    try {
      // Update de taakstatus
      const task = await this.taskManagementService.updateTaskStatus(
        taskId,
        newStatus,
        serverId,
        updatedById
      );

      // Emit voortgangsupdate event voor notificaties
      await this.eventBus.emit('workflow.task.progress', {
        taskId: task.id,
        serverId,
        status: newStatus,
        updatedById,
        comment,
        timestamp: new Date(),
      });

      return task;
    } catch (error) {
      throw new TaskWorkflowError(
        `Failed to progress task: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Reassign een taak met notificaties naar oude en nieuwe assignee
   */
  async reassignTaskWithNotifications(
    taskId: string,
    newAssigneeId: string,
    serverId: string,
    reassignedById: string,
    reason?: string
  ): Promise<Task> {
    try {
      // Haal oude taak op voor de oude assignee
      const oldTask = await this.taskManagementService.getTaskById(
        taskId,
        serverId
      );
      if (!oldTask) {
        throw new TaskWorkflowError('Task not found');
      }

      // Update de toewijzing
      const task = await this.taskManagementService.assignTask(
        taskId,
        newAssigneeId,
        serverId
      );

      // Emit reassignment workflow event
      await this.eventBus.emit('workflow.task.reassigned', {
        taskId: task.id,
        serverId,
        oldAssigneeId: oldTask.assigneeId,
        newAssigneeId,
        reassignedById,
        reason,
        timestamp: new Date(),
      });

      return task;
    } catch (error) {
      throw new TaskWorkflowError(
        `Failed to reassign task: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Update een taak met deadline changes en notificaties
   */
  async updateTaskWithDeadline(
    taskId: string,
    updates: UpdateTaskParams,
    serverId: string,
    updatedById: string
  ): Promise<Task> {
    try {
      const oldTask = await this.taskManagementService.getTaskById(
        taskId,
        serverId
      );
      if (!oldTask) {
        throw new TaskWorkflowError('Task not found');
      }

      // Update de taak
      const task = await this.taskManagementService.updateTask(
        taskId,
        updates,
        serverId
      );

      // Als de deadline is gewijzigd, emit een specifiek event
      if (updates.deadline && oldTask.deadline !== updates.deadline) {
        await this.eventBus.emit('workflow.task.deadline.changed', {
          taskId: task.id,
          serverId,
          oldDeadline: oldTask.deadline,
          newDeadline: updates.deadline,
          updatedById,
          timestamp: new Date(),
        });
      }

      return task;
    } catch (error) {
      throw new TaskWorkflowError(
        `Failed to update task deadline: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}