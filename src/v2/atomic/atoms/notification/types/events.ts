import { NotificationType } from './enums';
import { Notification } from './types';

export interface ExtraTemplateData {
  [key: string]: string;
}

export interface TaskEvent {
  taskId: string;
  serverId: string;
  extraData?: ExtraTemplateData;
}

export interface ReminderEvent {
  taskId: string;
  scheduleId: string;
  serverId: string;
  timestamp: Date;
}

export interface NotificationEvent {
  type: NotificationType;
  notification: Notification;
  serverId: string;
  timestamp: Date;
}