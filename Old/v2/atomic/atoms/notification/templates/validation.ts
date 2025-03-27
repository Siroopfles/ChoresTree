import { NotificationType } from '../types/enums';

export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

/**
 * Required variables for each notification type
 */
export const requiredVariables: Record<NotificationType, string[]> = {
  // Legacy types
  [NotificationType.REMINDER]: [
    'task.title',
    'task.deadline',
    'task.status'
  ],
  [NotificationType.TASK_CREATED]: [
    'task.title',
    'task.description',
    'task.assignee'
  ],
  [NotificationType.TASK_UPDATED]: [
    'task.title',
    'changes'
  ],
  
  // V2 types
  [NotificationType.TASK_REMINDER]: [
    'task.title',
    'task.deadline',
    'task.status'
  ],
  [NotificationType.TASK_DUE]: [
    'task.title',
    'task.deadline',
    'task.status'
  ],
  [NotificationType.TASK_OVERDUE]: [
    'task.title',
    'task.deadline'
  ],
  [NotificationType.TASK_ASSIGNED]: [
    'task.title',
    'task.assignee',
    'task.deadline'
  ],
  [NotificationType.TASK_COMPLETED]: [
    'task.title',
    'completedBy'
  ],
  [NotificationType.SYSTEM_ALERT]: [
    'message'
  ],
};

/**
 * Validates if a template contains all required variables for its type
 */
export function validateTemplate(template: string, type: NotificationType): void {
  const required = requiredVariables[type];
  
  for (const variable of required) {
    if (!template.includes(`{${variable}}`)) {
      throw new TemplateValidationError(
        `Template missing required variable: {${variable}}`
      );
    }
  }
}

/**
 * Validates if provided variables match the template requirements
 */
export function validateVariables(
  variables: Record<string, string>,
  type: NotificationType
): void {
  const required = requiredVariables[type];
  
  for (const variable of required) {
    if (!(variable in variables)) {
      throw new TemplateValidationError(
        `Missing required variable: ${variable}`
      );
    }
  }
}