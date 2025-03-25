import { IConfigRepository, ConfigPermission, ConfigScope } from '../../../atoms/config/types';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class PermissionService {
  constructor(private readonly configRepo: IConfigRepository) {}

  async getPermissions(serverId: string, roleId: string): Promise<ConfigPermission> {
    try {
      return await this.configRepo.getPermissions(serverId, roleId);
    } catch {
      // If no permissions found, return default restricted permissions
      return {
        serverId,
        roleId,
        allowedScopes: [],
        allowedOperations: ['read']
      };
    }
  }

  async setPermissions(
    serverId: string,
    roleId: string,
    scopes: ConfigScope[],
    operations: ('read' | 'write' | 'delete')[],
    setByUserId: string
  ): Promise<void> {
    // Validate scopes and operations
    this.validatePermissionUpdate(scopes, operations);

    const permission: ConfigPermission = {
      serverId,
      roleId,
      allowedScopes: scopes,
      allowedOperations: operations
    };

    try {
      await this.configRepo.setPermissions(permission);

      // Log audit event
      await this.configRepo.logAuditEvent({
        serverId,
        userId: setByUserId,
        action: 'update',
        scope: ConfigScope.ROLE,
        newValue: {
          value: permission,
          scope: ConfigScope.ROLE,
          lastUpdated: new Date(),
          updatedBy: setByUserId
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new PermissionError(`Failed to set permissions: ${error.message}`);
      }
      throw error;
    }
  }

  async hasPermission(
    serverId: string,
    roleId: string,
    requiredScope: ConfigScope,
    requiredOperation: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    try {
      const permissions = await this.getPermissions(serverId, roleId);

      // Check if role has the required scope and operation
      return (
        permissions.allowedScopes.includes(requiredScope) &&
        permissions.allowedOperations.includes(requiredOperation)
      );
    } catch {
      // On error, deny permission
      return false;
    }
  }

  async checkPermission(
    serverId: string,
    roleId: string,
    requiredScope: ConfigScope,
    requiredOperation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const hasPermission = await this.hasPermission(
      serverId,
      roleId,
      requiredScope,
      requiredOperation
    );

    if (!hasPermission) {
      throw new PermissionError(
        `Role ${roleId} does not have ${requiredOperation} permission for scope ${requiredScope}`
      );
    }
  }

  private validatePermissionUpdate(
    scopes: ConfigScope[],
    operations: ('read' | 'write' | 'delete')[]
  ): void {
    // Validate scopes
    const validScopes = Object.values(ConfigScope);
    for (const scope of scopes) {
      if (!validScopes.includes(scope)) {
        throw new PermissionError(`Invalid scope: ${scope}`);
      }
    }

    // Validate operations
    const validOperations = ['read', 'write', 'delete'];
    for (const operation of operations) {
      if (!validOperations.includes(operation)) {
        throw new PermissionError(`Invalid operation: ${operation}`);
      }
    }

    // Ensure read permission is always included if write or delete is present
    if (
      (operations.includes('write') || operations.includes('delete')) &&
      !operations.includes('read')
    ) {
      throw new PermissionError('Read permission is required when granting write or delete permissions');
    }
  }
}