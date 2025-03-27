import { EventEmitter } from 'events';
import { ConfigScope, ServerConfig } from '../../../atoms/config/types';
import { ConfigManagementService } from '../../../molecules/config/services/ConfigManagementService';
import { PermissionService } from '../../../molecules/config/services/PermissionService';

interface ConfigUpdateContext {
  serverId: string;
  userId: string;
  oldConfig?: Partial<ServerConfig>;
  newConfig: Partial<ServerConfig>;
}

export class ConfigEventHandler {
  constructor(
    private readonly eventBus: EventEmitter,
    private readonly configService: ConfigManagementService,
    private readonly permissionService: PermissionService
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Server configuration events
    this.eventBus.on('serverConfigRequested', this.handleConfigRequest.bind(this));
    this.eventBus.on('serverConfigUpdateRequested', this.handleConfigUpdate.bind(this));
    this.eventBus.on('serverConfigResetRequested', this.handleConfigReset.bind(this));
    
    // Permission events
    this.eventBus.on('permissionUpdateRequested', this.handlePermissionUpdate.bind(this));
    this.eventBus.on('permissionCheckRequested', this.handlePermissionCheck.bind(this));

    // Listen for related system events that might require config updates
    this.eventBus.on('serverJoined', this.handleServerJoin.bind(this));
    this.eventBus.on('serverLeft', this.handleServerLeave.bind(this));
  }

  private async handleConfigRequest(serverId: string): Promise<void> {
    try {
      const config = await this.configService.getServerConfig(serverId);
      this.eventBus.emit('serverConfigFetched', { serverId, config });
    } catch (error) {
      this.eventBus.emit('configError', { 
        serverId, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleConfigUpdate(context: ConfigUpdateContext): Promise<void> {
    try {
      // Check permissions
      await this.permissionService.checkPermission(
        context.serverId,
        context.userId,
        ConfigScope.SERVER,
        'write'
      );

      // Update config
      await this.configService.updateServerConfig(
        context.serverId,
        context.userId,
        context.newConfig
      );

      this.eventBus.emit('serverConfigUpdated', context);
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId: context.serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleConfigReset(serverId: string, userId: string): Promise<void> {
    try {
      // Check permissions
      await this.permissionService.checkPermission(
        serverId,
        userId,
        ConfigScope.SERVER,
        'write'
      );

      // Reset config
      await this.configService.resetServerConfig(serverId, userId);

      this.eventBus.emit('serverConfigReset', { serverId });
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handlePermissionUpdate(
    serverId: string,
    roleId: string,
    scopes: ConfigScope[],
    operations: ('read' | 'write' | 'delete')[],
    setByUserId: string
  ): Promise<void> {
    try {
      // Admin check - only admins can modify permissions
      await this.permissionService.checkPermission(
        serverId,
        setByUserId,
        ConfigScope.ROLE,
        'write'
      );

      // Update permissions
      await this.permissionService.setPermissions(
        serverId,
        roleId,
        scopes,
        operations,
        setByUserId
      );

      this.eventBus.emit('permissionUpdated', { serverId, roleId });
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handlePermissionCheck(
    serverId: string,
    roleId: string,
    scope: ConfigScope,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    try {
      const hasPermission = await this.permissionService.hasPermission(
        serverId,
        roleId,
        scope,
        operation
      );

      this.eventBus.emit('permissionCheckCompleted', {
        serverId,
        roleId,
        scope,
        operation,
        hasPermission
      });
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleServerJoin(serverId: string): Promise<void> {
    try {
      // Initialize default config for new server
      const config = await this.configService.getServerConfig(serverId);
      if (!config) {
        await this.configService.resetServerConfig(serverId, 'system');
      }
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleServerLeave(serverId: string): Promise<void> {
    // Optional: Cleanup or archive server configuration
    this.eventBus.emit('serverConfigCleanupRequired', { serverId });
  }
}