import { TaskStatus } from '../../database/interfaces/Task';

// Valid status transitions map
export const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELLED,
    TaskStatus.OVERDUE,
  ],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.COMPLETED,
    TaskStatus.PENDING,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.COMPLETED]: [TaskStatus.PENDING], // Heropenen toegestaan
  [TaskStatus.OVERDUE]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.CANCELLED]: [TaskStatus.PENDING], // Heropenen toegestaan
};