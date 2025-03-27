export interface TaskNotificationData {
  taskId: string;
  taskTitle: string;
  assignee?: string;
  dueDate?: Date;
}

export interface ServerNotificationData {
  serverId: string;
  serverName: string;
  action: string;
  actor?: string;
}

export interface UserNotificationData {
  userId: string;
  username: string;
  action: string;
  details?: Record<string, string>;
}

export interface SystemNotificationData {
  type: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  details?: Record<string, string>;
}

export type NotificationData = 
  | TaskNotificationData 
  | ServerNotificationData 
  | UserNotificationData 
  | SystemNotificationData;