import { Permission } from '../../services/permission/PermissionService';
import { UserRole } from '../user/UserRepository';

export interface RoleRepository {
  /**
   * Vindt een rol op ID
   */
  findById(roleId: string): Promise<UserRole | null>;

  /**
   * Haalt alle permissies op voor een rol
   */
  findPermissions(roleId: string): Promise<Permission[]>;

  /**
   * Voegt permissies toe aan een rol
   */
  addPermissions(roleId: string, permissions: Permission[]): Promise<void>;

  /**
   * Verwijdert permissies van een rol
   */
  removePermissions(roleId: string, permissions: Permission[]): Promise<void>;

  /**
   * Controleert of een rol specifieke permissies heeft
   */
  hasPermissions(roleId: string, permissionNames: string[]): Promise<boolean>;

  /**
   * Haalt alle overgeërfde rollen op
   */
  getInheritedRoles(roleId: string): Promise<UserRole[]>;
}