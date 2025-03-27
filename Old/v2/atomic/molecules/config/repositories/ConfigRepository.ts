import { Repository, DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { ServerConfigEntity, ConfigPermissionEntity, ConfigAuditLogEntity } from '../../../atoms/config/entities/ConfigEntity';
import { IConfigRepository, ServerConfig, ConfigPermission, ConfigAuditLog } from '../../../atoms/config/types';

export class ConfigRepository implements IConfigRepository {
  private serverConfigRepo: Repository<ServerConfigEntity>;
  private permissionRepo: Repository<ConfigPermissionEntity>;
  private auditLogRepo: Repository<ConfigAuditLogEntity>;
  private redis: Redis;

  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_KEYS = {
    serverConfig: (serverId: string) => `server:${serverId}:config`,
    permissions: (serverId: string, roleId: string) => `server:${serverId}:role:${roleId}:permissions`
  };

  constructor(dataSource: DataSource, redis: Redis) {
    this.serverConfigRepo = dataSource.getRepository(ServerConfigEntity);
    this.permissionRepo = dataSource.getRepository(ConfigPermissionEntity);
    this.auditLogRepo = dataSource.getRepository(ConfigAuditLogEntity);
    this.redis = redis;
  }

  async getServerConfig(serverId: string): Promise<ServerConfig> {
    // Try cache first
    const cached = await this.redis.get(this.CACHE_KEYS.serverConfig(serverId));
    if (cached) {
      return JSON.parse(cached);
    }

    const config = await this.serverConfigRepo.findOne({ 
      where: { serverId }
    });

    if (!config) {
      throw new Error(`No configuration found for server ${serverId}`);
    }

    const serverConfig: ServerConfig = {
      serverId: config.serverId,
      version: config.version || '2.0.0', // Default to v2 if not set
      settings: config.settings,
      customization: config.customization
    };

    // Cache result
    await this.redis.set(
      this.CACHE_KEYS.serverConfig(serverId),
      JSON.stringify(serverConfig),
      'EX',
      this.CACHE_TTL
    );

    return serverConfig;
  }

  async updateServerConfig(serverId: string, config: Partial<ServerConfig>): Promise<void> {
    const existingConfig = await this.serverConfigRepo.findOne({
      where: { serverId }
    });

    if (!existingConfig) {
      // Create new config if it doesn't exist
      const newConfig = this.serverConfigRepo.create({
        serverId,
        settings: config.settings || {},
        customization: config.customization || {}
      });
      await this.serverConfigRepo.save(newConfig);
    } else {
      // Update existing config
      await this.serverConfigRepo.update(
        { serverId },
        {
          settings: { ...existingConfig.settings, ...config.settings },
          customization: { ...existingConfig.customization, ...config.customization }
        }
      );
    }

    // Invalidate cache
    await this.redis.del(this.CACHE_KEYS.serverConfig(serverId));
  }

  async getPermissions(serverId: string, roleId: string): Promise<ConfigPermission> {
    // Try cache first
    const cached = await this.redis.get(this.CACHE_KEYS.permissions(serverId, roleId));
    if (cached) {
      return JSON.parse(cached);
    }

    const permission = await this.permissionRepo.findOne({
      where: { serverId, roleId }
    });

    if (!permission) {
      throw new Error(`No permissions found for role ${roleId} in server ${serverId}`);
    }

    const configPermission: ConfigPermission = {
      serverId: permission.serverId,
      roleId: permission.roleId,
      allowedScopes: permission.allowedScopes,
      allowedOperations: permission.allowedOperations as ('read' | 'write' | 'delete')[]
    };

    // Cache result
    await this.redis.set(
      this.CACHE_KEYS.permissions(serverId, roleId),
      JSON.stringify(configPermission),
      'EX',
      this.CACHE_TTL
    );

    return configPermission;
  }

  async setPermissions(permission: ConfigPermission): Promise<void> {
    const existingPermission = await this.permissionRepo.findOne({
      where: {
        serverId: permission.serverId,
        roleId: permission.roleId
      }
    });

    if (!existingPermission) {
      // Create new permission
      const newPermission = this.permissionRepo.create(permission);
      await this.permissionRepo.save(newPermission);
    } else {
      // Update existing permission
      await this.permissionRepo.update(
        { serverId: permission.serverId, roleId: permission.roleId },
        permission
      );
    }

    // Invalidate cache
    await this.redis.del(this.CACHE_KEYS.permissions(permission.serverId, permission.roleId));
  }

  async logAuditEvent(event: Omit<ConfigAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog = this.auditLogRepo.create({
      serverId: event.serverId,
      userId: event.userId,
      action: event.action,
      scope: event.scope,
      oldValue: event.oldValue ? {
        value: event.oldValue.value,
        scope: event.oldValue.scope,
        lastUpdated: event.oldValue.lastUpdated,
        updatedBy: event.oldValue.updatedBy
      } : undefined,
      newValue: {
        value: event.newValue.value,
        scope: event.newValue.scope,
        lastUpdated: event.newValue.lastUpdated,
        updatedBy: event.newValue.updatedBy
      }
    });

    await this.auditLogRepo.save(auditLog);
  }
}