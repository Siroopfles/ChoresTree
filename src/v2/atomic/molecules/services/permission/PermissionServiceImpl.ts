import { Injectable } from '@nestjs/common';
import { Permission, PermissionService, PermissionType } from './PermissionService';
import { UserRepository } from '../../repositories/user/UserRepository';
import { RoleRepository } from '../../repositories/role/RoleRepository';

@Injectable()
export class PermissionServiceImpl implements PermissionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository
  ) {}

  async hasPermission(userId: string, permission: PermissionType): Promise<boolean> {
    if (!Object.values(PermissionType).includes(permission as any)) {
      throw new Error('Invalid permission type');
    }

    const userRoles = await this.userRepository.findRoles(userId);
    if (!userRoles.length) return false;

    // Check direct role permissions
    for (const role of userRoles) {
      if (role.permissions.includes(permission)) {
        return true;
      }

      // Check inherited permissions
      if (role.inheritsFrom) {
        const inheritedRole = await this.roleRepository.findById(role.inheritsFrom);
        if (inheritedRole?.permissions.includes(permission)) {
          return true;
        }
      }
    }

    return false;
  }

  async validateScope(userId: string, requiredScope: string[]): Promise<boolean> {
    const userRoles = await this.userRepository.findRoles(userId);
    if (!userRoles.length) return false;

    // Collect all permissions for user's roles
    const permissions: Permission[] = [];
    for (const role of userRoles) {
      const rolePermissions = await this.roleRepository.findPermissions(role.id);
      permissions.push(...rolePermissions);
    }

    // Check if any permission's scope matches required scope
    return permissions.some(permission => {
      return permission.scope.some(scope => {
        // Handle wildcard scopes
        if (scope === '*') return true;
        
        // Check if scope matches any required scope
        return requiredScope.some(required => {
          // Replace variables in scope pattern
          const pattern = scope.replace(/\${(\w+)}/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(required);
        });
      });
    });
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.userRepository.findRoles(userId);
    const permissions = new Set<Permission>();

    for (const role of userRoles) {
      const rolePermissions = await this.roleRepository.findPermissions(role.id);
      rolePermissions.forEach(permission => permissions.add(permission));

      // Add inherited permissions
      if (role.inheritsFrom) {
        const inheritedRole = await this.roleRepository.findById(role.inheritsFrom);
        if (inheritedRole) {
          const inheritedPermissions = await this.roleRepository.findPermissions(inheritedRole.id);
          inheritedPermissions.forEach(permission => permissions.add(permission));
        }
      }
    }

    return Array.from(permissions);
  }

  async addPermissionsToRole(roleId: string, permissions: Permission[]): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    await this.roleRepository.addPermissions(roleId, permissions);
  }

  async removePermissionsFromRole(roleId: string, permissions: Permission[]): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    await this.roleRepository.removePermissions(roleId, permissions);
  }
}