import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export class TaskValidationService {
  private static readonly TITLE_MAX_LENGTH = 100;
  private static readonly DESCRIPTION_MAX_LENGTH = 1000;

  validateTask(task: Partial<Task>): void {
    this.validateTitle(task.title);
    this.validateDescription(task.description);
    this.validateDeadline(task.deadline);
    this.validateStatus(task.status);
    this.validateAssignee(task.assigneeId);
  }

  private validateTitle(title?: string): void {
    if (!title?.trim()) {
      throw new TaskValidationError('Title is required');
    }
    if (title.length > TaskValidationService.TITLE_MAX_LENGTH) {
      throw new TaskValidationError(
        `Title must be less than ${TaskValidationService.TITLE_MAX_LENGTH} characters`
      );
    }
  }

  private validateDescription(description?: string): void {
    if (description && description.length > TaskValidationService.DESCRIPTION_MAX_LENGTH) {
      throw new TaskValidationError(
        `Description must be less than ${TaskValidationService.DESCRIPTION_MAX_LENGTH} characters`
      );
    }
  }

  private validateDeadline(deadline?: Date): void {
    if (deadline && deadline < new Date()) {
      throw new TaskValidationError('Deadline cannot be in the past');
    }
  }

  private validateStatus(status?: TaskStatus): void {
    if (status && !Object.values(TaskStatus).includes(status)) {
      throw new TaskValidationError('Invalid task status');
    }
  }

  private validateAssignee(assigneeId?: string): void {
    if (!assigneeId?.trim()) {
      throw new TaskValidationError('Assignee ID is required');
    }
  }

  // Performance geoptimaliseerde bulk validatie
  async validateTasks(tasks: Partial<Task>[]): Promise<TaskValidationError[]> {
    const errors: TaskValidationError[] = [];
    
    // Parallel validatie voor betere performance
    await Promise.all(
      tasks.map(async (task, index) => {
        try {
          this.validateTask(task);
        } catch (error) {
          if (error instanceof TaskValidationError) {
            errors[index] = error;
          }
        }
      })
    );

    return errors;
  }
}