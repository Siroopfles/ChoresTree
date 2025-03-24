import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { EventBus } from '@/core/eventBus';

export class AssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssignmentError';
  }
}

interface AssignmentResult {
  success: boolean;
  task?: Task;
  error?: string;
}

export class AssignmentService {
  private static instance: AssignmentService;
  private maxTasksPerUser: number = 5;

  constructor(
    private taskRepository: TaskRepository,
    private eventBus: EventBus
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
    assigneeId: string,
    serverId: string
  ): Promise<AssignmentResult> {
    try {
      // Check user's current task load
      const currentTasks = await this.taskRepository.findTasksByAssignee(
        serverId,
        assigneeId
      );

      if (currentTasks.length >= this.maxTasksPerUser) {
        return {
          success: false,
          error: `User already has maximum number of tasks (${this.maxTasksPerUser})`,
        };
      }

      // Get and update task
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      if (task.serverId !== serverId) {
        return { success: false, error: 'Task does not belong to this server' };
      }

      // Update task assignment
      task.assigneeId = assigneeId;
      task.status = TaskStatus.PENDING;
      
      await this.taskRepository.update(task.id, {
        assigneeId: task.assigneeId,
        status: task.status
      });

      // Emit task assigned event
      await this.eventBus.emit('task.assigned', {
        taskId: task.id,
        assigneeId,
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

  async unassignTask(
    taskId: string,
    serverId: string
  ): Promise<AssignmentResult> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      if (task.serverId !== serverId) {
        return { success: false, error: 'Task does not belong to this server' };
      }

      const previousAssignee = task.assigneeId;

      // Update task
      task.assigneeId = '';
      task.status = TaskStatus.PENDING;
      
      await this.taskRepository.update(task.id, {
        assigneeId: task.assigneeId,
        status: task.status
      });

      // Emit task unassigned event
      await this.eventBus.emit('task.unassigned', {
        taskId: task.id,
        previousAssignee,
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

  async reassignTask(
    taskId: string,
    newAssigneeId: string,
    serverId: string
  ): Promise<AssignmentResult> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      if (task.serverId !== serverId) {
        return { success: false, error: 'Task does not belong to this server' };
      }

      const previousAssignee = task.assigneeId;

      // Check new assignee's task load
      const currentTasks = await this.taskRepository.findTasksByAssignee(
        serverId,
        newAssigneeId
      );

      if (currentTasks.length >= this.maxTasksPerUser) {
        return {
          success: false,
          error: `New assignee already has maximum number of tasks (${this.maxTasksPerUser})`,
        };
      }

      // Update task
      task.assigneeId = newAssigneeId;
      // Behoud huidige status tenzij al completed
      if (task.status === TaskStatus.COMPLETED) {
        task.status = TaskStatus.PENDING;
      }
      
      await this.taskRepository.update(task.id, {
        assigneeId: task.assigneeId,
        status: task.status
      });

      // Emit task reassigned event
      await this.eventBus.emit('task.reassigned', {
        taskId: task.id,
        previousAssignee,
        newAssigneeId,
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

  // Helper methods
  setMaxTasksPerUser(max: number): void {
    if (max < 1) {
      throw new AssignmentError('Maximum tasks per user must be at least 1');
    }
    this.maxTasksPerUser = max;
  }

  async getAssignedTaskCount(assigneeId: string, serverId: string): Promise<number> {
    const tasks = await this.taskRepository.findTasksByAssignee(serverId, assigneeId);
    return tasks.length;
  }
}