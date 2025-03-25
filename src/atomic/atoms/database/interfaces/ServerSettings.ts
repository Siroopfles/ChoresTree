import { IBaseEntity, IServerScoped } from './BaseEntity';

export interface IServerSettings extends IBaseEntity, IServerScoped {
  defaultReminderFrequency: number; // in minutes
  defaultTaskPriority: string;
  timezone: string;
  notificationChannelId: string;
  adminRoleIds: string[];
  managerRoleIds: string[];
  enabledFeatures: EnabledFeatures;
  customCategories: string[];
}

export interface EnabledFeatures {
  automaticReminders: boolean;
  deadlineEscalation: boolean;
  categoryManagement: boolean;
  taskTemplates: boolean;
  statistics: boolean;
}

// Default waarden voor nieuwe server settings
export const DEFAULT_SERVER_SETTINGS: Partial<IServerSettings> = {
  defaultReminderFrequency: 1440, // 24 uur in minuten
  defaultTaskPriority: 'MEDIUM',
  timezone: 'Europe/Amsterdam',
  enabledFeatures: {
    automaticReminders: true,
    deadlineEscalation: true,
    categoryManagement: true,
    taskTemplates: false,
    statistics: true,
  },
  customCategories: ['General', 'Maintenance', 'Events'],
};
