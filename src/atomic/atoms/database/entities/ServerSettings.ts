import { Entity, Column } from 'typeorm';
import { ServerScopedEntity } from './BaseEntity';
import { IServerSettings, EnabledFeatures, DEFAULT_SERVER_SETTINGS } from '../interfaces/ServerSettings';

@Entity('server_settings')
export class ServerSettings extends ServerScopedEntity implements IServerSettings {
  @Column({
    type: 'int',
    default: DEFAULT_SERVER_SETTINGS.defaultReminderFrequency,
  })
  defaultReminderFrequency: number;

  @Column({
    default: DEFAULT_SERVER_SETTINGS.defaultTaskPriority,
  })
  defaultTaskPriority: string;

  @Column({
    default: DEFAULT_SERVER_SETTINGS.timezone,
  })
  timezone: string;

  @Column()
  notificationChannelId: string;

  @Column('text', { array: true })
  adminRoleIds: string[];

  @Column('text', { array: true })
  managerRoleIds: string[];

  @Column('jsonb', {
    default: DEFAULT_SERVER_SETTINGS.enabledFeatures,
  })
  enabledFeatures: EnabledFeatures;

  @Column('text', {
    array: true,
    default: DEFAULT_SERVER_SETTINGS.customCategories,
  })
  customCategories: string[];

  // Utility methodes
  isFeatureEnabled(feature: keyof EnabledFeatures): boolean {
    return this.enabledFeatures[feature] || false;
  }

  hasAdminRole(roleId: string): boolean {
    return this.adminRoleIds.includes(roleId);
  }

  hasManagerRole(roleId: string): boolean {
    return this.managerRoleIds.includes(roleId) || this.hasAdminRole(roleId);
  }

  isCategoryValid(category: string): boolean {
    return this.customCategories.includes(category);
  }

  addCategory(category: string): void {
    if (!this.isCategoryValid(category)) {
      this.customCategories.push(category);
    }
  }

  removeCategory(category: string): void {
    const index = this.customCategories.indexOf(category);
    if (index > -1) {
      this.customCategories.splice(index, 1);
    }
  }
}
