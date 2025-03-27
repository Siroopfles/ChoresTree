export interface TaskAssignmentResult {
  success: boolean;
  taskId: string;
  assigneeId: string;
  error?: string;
}