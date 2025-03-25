import { EventBus } from '@/core/eventBus';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { 
  StatusTrackingService, 
  TaskValidationService,
  TaskManagementService 
} from '@/atomic/molecules/task/services';

export class TaskProcessor {
  private static instance: TaskProcessor;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1 minuut

  private readonly statusTrackingService: StatusTrackingService;
  private readonly taskValidationService: TaskValidationService;
  private readonly taskManagementService: TaskManagementService;

  private constructor(
    private taskRepository: TaskRepository,
    private eventBus: EventBus
  ) {
    this.statusTrackingService = StatusTrackingService.getInstance(taskRepository, eventBus);
    this.taskValidationService = new TaskValidationService();
    this.taskManagementService = TaskManagementService.getInstance(taskRepository, eventBus);
    this.startProcessing();
  }

  public static getInstance(
    taskRepository: TaskRepository,
    eventBus: EventBus
  ): TaskProcessor {
    if (!TaskProcessor.instance) {
      TaskProcessor.instance = new TaskProcessor(taskRepository, eventBus);
    }
    return TaskProcessor.instance;
  }

  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(
      () => this.processPendingTasks(),
      this.CHECK_INTERVAL
    );
  }

  private async processPendingTasks(): Promise<void> {
    try {
      // Gebruik de repository method voor overdue tasks
      const overdueTasks = await this.taskRepository.findOverdueTasks('*');

      if (!overdueTasks.length) {
        return; // Geen taken om te verwerken
      }

      // Groepeer taken per server voor efficiënte verwerking
      const tasksByServer = new Map<string, Task[]>();
      
      overdueTasks.forEach((task: Task) => {
        const tasks = tasksByServer.get(task.serverId) || [];
        tasks.push(task);
        tasksByServer.set(task.serverId, tasks);
      });

      // Verwerk taken per server
      for (const [serverId, tasks] of tasksByServer) {
        await this.processTasks(tasks, serverId);
      }
    } catch (error: unknown) {
      console.error('Error processing pending tasks:', error);
    }
  }

  private async processTasks(tasks: Task[], serverId: string): Promise<void> {
    for (const task of tasks) {
      try {
        // Gebruik de service voor status updates
        await this.statusTrackingService.updateStatus(
          task.id,
          TaskStatus.OVERDUE,
          serverId,
          'system'
        );
      } catch (error: unknown) {
        console.error(`Error processing task ${task.id}:`, error);
      }
    }
  }

  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}