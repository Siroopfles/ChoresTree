import { EventBus } from '@/v2/core/EventBus';
import { TaskManagementService, TaskStatus } from '../../../molecules/task';

export class TaskEventHandler {
  private static instance: TaskEventHandler;

  private constructor(
    private readonly eventBus: EventBus,
    private readonly taskManagementService: TaskManagementService
  ) {
    this.setupEventHandlers();
  }

  public static getInstance(
    eventBus: EventBus,
    taskManagementService: TaskManagementService
  ): TaskEventHandler {
    if (!TaskEventHandler.instance) {
      TaskEventHandler.instance = new TaskEventHandler(
        eventBus,
        taskManagementService
      );
    }
    return TaskEventHandler.instance;
  }

  private setupEventHandlers(): void {
    // Task lifecycle events
    this.eventBus.on('workflow.task.created', this.handleTaskCreated.bind(this));
    this.eventBus.on('workflow.task.progress', this.handleTaskProgress.bind(this));
    this.eventBus.on('workflow.task.reassigned', this.handleTaskReassigned.bind(this));
    this.eventBus.on('workflow.task.deadline.changed', this.handleDeadlineChanged.bind(this));

    // System maintenance events
    this.eventBus.on('system.maintenance.daily', this.handleDailyMaintenance.bind(this));
    this.eventBus.on('system.maintenance.hourly', this.handleHourlyMaintenance.bind(this));
  }

  // Event Handlers

  private async handleTaskCreated(event: {
    taskId: string;
    serverId: string;
    assigneeId: string;
    deadline?: Date;
    priority?: number;
  }): Promise<void> {
    try {
      // Controleer of er direct herinneringen moeten worden ingesteld
      if (event.deadline) {
        await this.eventBus.emit('notification.reminder.schedule', {
          taskId: event.taskId,
          serverId: event.serverId,
          assigneeId: event.assigneeId,
          deadline: event.deadline,
          priority: event.priority,
        });
      }
    } catch (error) {
      console.error('Failed to handle task created event:', error);
    }
  }

  private async handleTaskProgress(event: {
    taskId: string;
    serverId: string;
    status: TaskStatus;
    updatedById: string;
    comment?: string;
  }): Promise<void> {
    try {
      // Stuur notificaties gebaseerd op de nieuwe status
      if (event.status === TaskStatus.COMPLETED) {
        await this.eventBus.emit('notification.task.completed', {
          taskId: event.taskId,
          serverId: event.serverId,
          completedById: event.updatedById,
          comment: event.comment,
        });
      } else if (event.status === TaskStatus.BLOCKED) {
        await this.eventBus.emit('notification.task.blocked', {
          taskId: event.taskId,
          serverId: event.serverId,
          blockedById: event.updatedById,
          reason: event.comment,
        });
      }
    } catch (error) {
      console.error('Failed to handle task progress event:', error);
    }
  }

  private async handleTaskReassigned(event: {
    taskId: string;
    serverId: string;
    oldAssigneeId: string;
    newAssigneeId: string;
    reassignedById: string;
    reason?: string;
  }): Promise<void> {
    try {
      // Stuur notificaties naar zowel oude als nieuwe assignee
      await Promise.all([
        this.eventBus.emit('notification.task.unassigned', {
          taskId: event.taskId,
          serverId: event.serverId,
          userId: event.oldAssigneeId,
          reassignedById: event.reassignedById,
          reason: event.reason,
        }),
        this.eventBus.emit('notification.task.assigned', {
          taskId: event.taskId,
          serverId: event.serverId,
          userId: event.newAssigneeId,
          assignedById: event.reassignedById,
          reason: event.reason,
        }),
      ]);
    } catch (error) {
      console.error('Failed to handle task reassigned event:', error);
    }
  }

  private async handleDeadlineChanged(event: {
    taskId: string;
    serverId: string;
    oldDeadline: Date;
    newDeadline: Date;
    updatedById: string;
  }): Promise<void> {
    try {
      // Update herinneringen voor de nieuwe deadline
      await this.eventBus.emit('notification.reminder.reschedule', {
        taskId: event.taskId,
        serverId: event.serverId,
        oldDeadline: event.oldDeadline,
        newDeadline: event.newDeadline,
        updatedById: event.updatedById,
      });
    } catch (error) {
      console.error('Failed to handle deadline changed event:', error);
    }
  }

  // Maintenance Handlers

  private async handleHourlyMaintenance(): Promise<void> {
    try {
      // Check voor taken die binnenkort aflopen
      const servers = await this.taskManagementService.getOverdueTasks('*');
      for (const server of servers) {
        await this.taskManagementService.checkAndUpdateOverdueTasks(server.id);
      }
    } catch (error) {
      console.error('Failed to handle hourly maintenance:', error);
    }
  }

  private async handleDailyMaintenance(): Promise<void> {
    try {
      // Stuur dagelijkse overzichten
      await this.eventBus.emit('notification.daily.summary', {
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to handle daily maintenance:', error);
    }
  }
}