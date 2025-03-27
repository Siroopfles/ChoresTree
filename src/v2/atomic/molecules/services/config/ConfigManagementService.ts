import { Injectable } from '@nestjs/common';
import { ConfigRepository } from '@/v2/atomic/molecules/repositories/config/ConfigRepository';
import { PermissionService, PermissionType } from '@/v2/atomic/molecules/services/permission/PermissionService';
import { ServerConfigDto } from './dto/ServerConfigDto';
import { ConfigUpdateDto } from './dto/ConfigUpdateDto';

@Injectable()
export class ConfigManagementService {
  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly permissionService: PermissionService
  ) {}

  async getServerConfig(serverId: string): Promise<ServerConfigDto> {
    const config = await this.configRepository.findByServerId(serverId);
    if (!config) {
      throw new Error('Server configuration not found');
    }
    return config;
  }

  async createServerConfig(config: Partial<ServerConfigDto>, userId: string): Promise<ServerConfigDto> {
    const hasPermission = await this.permissionService.hasPermission(userId, PermissionType.CONFIG_CREATE);
    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Apply default settings
    const defaultSettings = {
      notifications: true,
      language: 'nl',
      timezone: 'Europe/Amsterdam'
    };

    const newConfig = {
      ...config,
      settings: {
        ...defaultSettings,
        ...config.settings
      }
    };

    return this.configRepository.create(newConfig);
  }

  async updateServerConfig(update: ConfigUpdateDto, userId: string): Promise<ServerConfigDto> {
    const hasPermission = await this.permissionService.hasPermission(userId, PermissionType.CONFIG_UPDATE);
    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    try {
      const existingConfig = await this.configRepository.findByServerId(update.serverId);
      if (!existingConfig) {
        throw new Error('Configuration not found');
      }

      const updatedConfig = {
        ...existingConfig,
        settings: {
          ...existingConfig.settings,
          ...update.settings
        }
      };

      return await this.configRepository.update(updatedConfig);
    } catch (error: unknown) {
      throw new Error('Failed to update configuration');
    }
  }

  async bulkUpdateConfigs(updates: ConfigUpdateDto[], userId: string): Promise<ServerConfigDto[]> {
    const hasPermission = await this.permissionService.hasPermission(userId, PermissionType.CONFIG_BULK_UPDATE);
    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Validate all updates before processing
    for (const update of updates) {
      this.validateConfigUpdate(update);
    }

    return this.configRepository.bulkUpdate(updates);
  }

  private validateConfigUpdate(update: ConfigUpdateDto): void {
    const allowedKeys = ['notifications', 'language', 'timezone'];
    const updateKeys = Object.keys(update.settings || {});

    const hasInvalidKey = updateKeys.some(key => !allowedKeys.includes(key));
    if (hasInvalidKey) {
      throw new Error('Invalid configuration key');
    }
  }
}