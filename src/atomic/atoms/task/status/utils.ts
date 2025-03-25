import { TaskStatus } from '../../database/interfaces/Task';
import { validTransitions } from './constants';

export function isValidStatusTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): boolean {
  return validTransitions[fromStatus]?.includes(toStatus) ?? false;
}

export function isTaskInProgress(status: TaskStatus): boolean {
  return (
    status === TaskStatus.PENDING ||
    status === TaskStatus.IN_PROGRESS ||
    status === TaskStatus.OVERDUE
  );
}

export function getDefaultStatus(): TaskStatus {
  return TaskStatus.PENDING;
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED;
}

export interface StatusCheckTask {
  status: TaskStatus;
  deadline?: Date;
  completedAt?: Date;
}

export function shouldUpdateStatus(task: StatusCheckTask): {
  shouldUpdate: boolean;
  newStatus: TaskStatus;
} {
  // Check voor completed status
  if (task.completedAt) {
    switch (task.status) {
      case TaskStatus.COMPLETED:
      case TaskStatus.CANCELLED:
        return { shouldUpdate: false, newStatus: task.status };
      default:
        return { shouldUpdate: true, newStatus: TaskStatus.COMPLETED };
    }
  }

  // Check voor overdue
  if (
    task.deadline &&
    new Date() > task.deadline &&
    task.status === TaskStatus.PENDING
  ) {
    return { shouldUpdate: true, newStatus: TaskStatus.OVERDUE };
  }

  return { shouldUpdate: false, newStatus: task.status };
}