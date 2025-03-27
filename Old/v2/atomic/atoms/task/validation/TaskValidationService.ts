import { TaskData, TaskValidationResult } from '../types';

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export class TaskValidationService {
  private static instance: TaskValidationService;

  private constructor() {}

  public static getInstance(): TaskValidationService {
    if (!TaskValidationService.instance) {
      TaskValidationService.instance = new TaskValidationService();
    }
    return TaskValidationService.instance;
  }

  public validateTask(task: Partial<TaskData>): TaskValidationResult {
    const errors: string[] = [];

    // Required field validatie
    if (!task.title?.trim()) {
      errors.push('Title is required and cannot be empty');
    } else if (task.title.length > 100) {
      errors.push('Title cannot exceed 100 characters');
    }

    if (!task.description?.trim()) {
      errors.push('Description is required and cannot be empty');
    } else if (task.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    if (!task.serverId?.trim()) {
      errors.push('Server ID is required');
    }

    if (!task.assigneeId?.trim()) {
      errors.push('Assignee ID is required');
    }

    // Deadline validatie
    if (task.deadline) {
      if (!(task.deadline instanceof Date)) {
        errors.push('Deadline must be a valid date');
      } else if (task.deadline < new Date()) {
        errors.push('Deadline cannot be in the past');
      }
    }

    // Reminder frequency validatie
    if (task.reminderFrequency !== undefined) {
      if (
        !Number.isInteger(task.reminderFrequency) ||
        task.reminderFrequency < 0
      ) {
        errors.push('Reminder frequency must be a positive integer');
      }
    }

    // Category validatie
    if (task.category && task.category.length > 50) {
      errors.push('Category cannot exceed 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public validateTaskUpdate(update: Partial<TaskData>): TaskValidationResult {
    const errors: string[] = [];

    // Optional field validatie voor updates
    if (update.title !== undefined) {
      if (!update.title.trim()) {
        errors.push('Title cannot be empty if provided');
      } else if (update.title.length > 100) {
        errors.push('Title cannot exceed 100 characters');
      }
    }

    if (update.description !== undefined) {
      if (!update.description.trim()) {
        errors.push('Description cannot be empty if provided');
      } else if (update.description.length > 1000) {
        errors.push('Description cannot exceed 1000 characters');
      }
    }

    // Deadline validatie
    if (update.deadline) {
      if (!(update.deadline instanceof Date)) {
        errors.push('Deadline must be a valid date');
      } else if (update.deadline < new Date()) {
        errors.push('Deadline cannot be in the past');
      }
    }

    // Reminder frequency validatie
    if (update.reminderFrequency !== undefined) {
      if (
        !Number.isInteger(update.reminderFrequency) ||
        update.reminderFrequency < 0
      ) {
        errors.push('Reminder frequency must be a positive integer');
      }
    }

    // Category validatie
    if (update.category !== undefined && update.category.length > 50) {
      errors.push('Category cannot exceed 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}