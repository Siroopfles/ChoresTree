import { TaskManagementService } from './TaskManagementService';
import { AssignmentService } from './AssignmentService';
import { StatusTrackingService } from './StatusTrackingService';
import { TaskValidationService } from './TaskValidationService';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { eventBus } from '@/core/eventBus';

// Initializeer de services met dependencies
const taskRepository = new TaskRepository();

export const taskManagementService = TaskManagementService.getInstance(
  taskRepository,
  eventBus
);

export const assignmentService = AssignmentService.getInstance(
  taskRepository,
  eventBus
);

export const statusTrackingService = StatusTrackingService.getInstance(
  taskRepository,
  eventBus
);

export const taskValidationService = new TaskValidationService();

// Re-export types en errors
export * from './TaskManagementService';
export * from './AssignmentService';
export * from './StatusTrackingService';
export * from './TaskValidationService';

// Re-export service classes voor testing/mocking
export {
  TaskManagementService,
  AssignmentService,
  StatusTrackingService,
  TaskValidationService,
};