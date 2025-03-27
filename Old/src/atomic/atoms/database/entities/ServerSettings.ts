import { Entity, Column } from 'typeorm';
import { ServerScopedEntity } from './BaseEntity';
import {
  IServerSettings,
  EnabledFeatures,
  DEFAULT_SERVER_SETTINGS,
  CommandPermissionsMap
} from '../interfaces/ServerSettings';

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

  @Column('jsonb', {
    default: DEFAULT_SERVER_SETTINGS.commandPermissions
  })
  commandPermissions: CommandPermissionsMap;

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

  hasCommandPermission(roleIds: string[], command: string): boolean {
    const permissions = this.commandPermissions[command];
    if (!permissions) return true; // Standaard toegestaan als er geen specifieke permissions zijn

    // Check eerst denied roles (deze hebben voorrang)
    if (permissions.deniedRoles.some(deniedRole => roleIds.includes(deniedRole))) {
      return false;
    }

    // Als er allowed roles zijn, moet de gebruiker er één hebben
    if (permissions.allowedRoles.length > 0) {
      return permissions.allowedRoles.some(allowedRole => roleIds.includes(allowedRole));
    }

    return true; // Standaard toegestaan als er geen allowed roles zijn gespecificeerd
  }
}
