import { EventEmitter } from 'events';
import { ConfigScope, ServerConfig, ConfigValidationError } from '../../../atoms/config/types';
import { ConfigManagementService } from '../../../molecules/config/services/ConfigManagementService';
import { PermissionService } from '../../../molecules/config/services/PermissionService';
import { ConfigValidatorService } from '../../../molecules/config/services/ConfigValidatorService';

export class ConfigurationFlow {
  constructor(
    private readonly eventBus: EventEmitter,
    private readonly configService: ConfigManagementService,
    private readonly permissionService: PermissionService,
    private readonly validator: ConfigValidatorService
  ) {}

  async initializeServer(serverId: string): Promise<void> {
    try {
      // Check if server already has config
      try {
        await this.configService.getServerConfig(serverId);
        // Config exists, no initialization needed
        return;
      } catch {
        // If no config exists, create default config
        await this.configService.resetServerConfig(serverId, 'system');
        
        // Set up default admin role permissions
        await this.permissionService.setPermissions(
          serverId,
          'admin',
          Object.values(ConfigScope),
          ['read', 'write', 'delete'],
          'system'
        );

        // Set up default moderator permissions
        await this.permissionService.setPermissions(
          serverId,
          'moderator',
          [ConfigScope.SERVER, ConfigScope.CHANNEL],
          ['read', 'write'],
          'system'
        );

        this.eventBus.emit('serverInitialized', { serverId });
      }
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateServerConfiguration(
    serverId: string,
    userId: string,
    roleId: string,
    configUpdate: Partial<ServerConfig>
  ): Promise<ConfigValidationError[] | undefined> {
    try {
      // Validate configuration update
      const validationErrors = await this.configService.validateConfigUpdate(configUpdate);
      if (validationErrors) {
        return validationErrors;
      }

      // Check permissions
      await this.permissionService.checkPermission(
        serverId,
        roleId,
        ConfigScope.SERVER,
        'write'
      );

      // Apply update
      await this.configService.updateServerConfig(serverId, userId, configUpdate);

      return undefined;
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async migrateServerConfiguration(
    serverId: string,
    userId: string,
    roleId: string,
    targetVersion: string
  ): Promise<void> {
    try {
      // Check admin permissions
      await this.permissionService.checkPermission(
        serverId,
        roleId,
        ConfigScope.SERVER,
        'write'
      );

      // Get current config
      const currentConfig = await this.configService.getServerConfig(serverId);

      // Perform migration based on version
      const migratedConfig = await this.migrateConfig(currentConfig, targetVersion);

      // Validate migrated config
      const validationErrors = await this.configService.validateConfigUpdate(migratedConfig);
      if (validationErrors) {
        throw new Error('Migration validation failed: ' + JSON.stringify(validationErrors));
      }

      // Apply migrated config
      await this.configService.updateServerConfig(serverId, userId, migratedConfig);

      this.eventBus.emit('configurationMigrated', {
        serverId,
        fromVersion: currentConfig.version,
        toVersion: targetVersion
      });
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async cleanupServerConfiguration(serverId: string): Promise<void> {
    try {
      // Archive configuration if needed
      const config = await this.configService.getServerConfig(serverId);
      
      // Emit cleanup event with config data
      this.eventBus.emit('serverConfigCleanupStarted', {
        serverId,
        config
      });

      // Cleanup can be implemented based on requirements
      // For now, we keep the config for record purposes
    } catch (error) {
      this.eventBus.emit('configError', {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async migrateConfig(
    config: ServerConfig,
    targetVersion: string
  ): Promise<Partial<ServerConfig>> {
    // Implement version-specific migrations here
    // This is a placeholder for the actual migration logic
    const migrated: Partial<ServerConfig> = {
      ...config,
      settings: { ...config.settings },
      customization: { ...config.customization },
      version: targetVersion
    };

    return migrated;
  }
}