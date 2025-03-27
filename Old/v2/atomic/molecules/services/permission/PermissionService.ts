export enum PermissionType {
  CONFIG_CREATE = 'CONFIG_CREATE',
  CONFIG_UPDATE = 'CONFIG_UPDATE',
  CONFIG_DELETE = 'CONFIG_DELETE',
  CONFIG_BULK_UPDATE = 'CONFIG_BULK_UPDATE',
  TASK_CREATE = 'TASK_CREATE',
  TASK_UPDATE = 'TASK_UPDATE',
  TASK_DELETE = 'TASK_DELETE',
  NOTIFICATION_CREATE = 'NOTIFICATION_CREATE',
  NOTIFICATION_UPDATE = 'NOTIFICATION_UPDATE',
  NOTIFICATION_DELETE = 'NOTIFICATION_DELETE'
}

export interface Permission {
  name: string;
  description: string;
  scope: string[];
}

export interface PermissionService {
  /**
   * Controleert of een gebruiker een specifieke permissie heeft
   */
  hasPermission(userId: string, permission: PermissionType): Promise<boolean>;

  /**
   * Valideert of een actie binnen de toegestane scope valt
   */
  validateScope(userId: string, scope: string[]): Promise<boolean>;

  /**
   * Haalt alle permissies op voor een gebruiker
   */
  getUserPermissions?(userId: string): Promise<Permission[]>;

  /**
   * Voegt permissies toe aan een rol
   */
  addPermissionsToRole?(roleId: string, permissions: Permission[]): Promise<void>;

  /**
   * Verwijdert permissies van een rol
   */
  removePermissionsFromRole?(roleId: string, permissions: Permission[]): Promise<void>;
}