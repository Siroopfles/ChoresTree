import { ConfigValue } from '@/atomic/atoms/database/entities/ConfigValue';
import { ConfigAuditLog } from '@/atomic/atoms/database/entities/ConfigAuditLog';
import { ServerScopedRepository } from './BaseRepository';
import { AppDataSource } from '@/config/database';
import { ConfigAuditLogEntry, ServerConfig, ConfigValueData } from '@/atomic/atoms/config/types/config';

const SERVER_CONFIG_PREFIX = 'server_config';

export class ConfigRepository extends ServerScopedRepository<ConfigValue> {
  private auditRepository;

  constructor() {
    super(AppDataSource.getRepository(ConfigValue), 'config_values', 3600); // 1 uur cache TTL
    this.auditRepository = AppDataSource.getRepository(ConfigAuditLog);
  }

  /**
   * Haalt een configuratie waarde op met caching
   */
  async getConfigValue<T>(serverId: string, key: string): Promise<ConfigValueData<T> | null> {
    const cacheKey = this.getConfigCacheKey(serverId, key);
    const cached = await this.getCache(cacheKey);
    if (cached) return cached.toData<T>();

    const value = await this.repository.findOne({
      where: { serverId, key }
    });

    if (value) {
      await this.setCache(cacheKey, value);
      return value.toData<T>();
    }

    return null;
  }

  /**
   * Update een configuratie waarde met cache invalidatie
   */
  async updateConfigValue<T>(
    serverId: string, 
    key: string, 
    data: ConfigValueData<T>
  ): Promise<void> {
    await this.repository.save({
      ...ConfigValue.fromData(data),
      serverId,
      key
    });

    const cacheKey = this.getConfigCacheKey(serverId, key);
    await this.clearCache(cacheKey);

    // Clear server config cache ook
    await this.clearServerConfigCache(serverId);
  }

  /**
   * Haalt alle configuratie voor een server op met caching
   */
  async getServerConfig(serverId: string): Promise<ServerConfig> {
    const cacheKey = this.getServerConfigCacheKey(serverId);
    const cached = await this.redisClient.get(cacheKey);
    
    if (cached) {
      try {
        return JSON.parse(cached) as ServerConfig;
      } catch {
        await this.clearServerConfigCache(serverId);
      }
    }

    const values = await this.repository.find({
      where: { serverId }
    });

    const config: ServerConfig = {
      serverId,
      values: new Map(
        values.map(v => [v.key, v.toData()])
      ),
      permissionOverrides: new Map() // TODO: Implement when permission system is ready
    };

    // Server config gebruikt eigen cache mechanisme omdat het een ander type is
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(config),
      'EX',
      this.cacheTTL
    );

    return config;
  }

  /**
   * Maakt een audit log entry aan
   */
  async createAuditLogEntry(entry: ConfigAuditLogEntry): Promise<void> {
    await this.auditRepository.save({
      serverId: entry.serverId,
      key: entry.key,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      updatedBy: entry.updatedBy,
      action: entry.action,
    });
  }

  /**
   * Verwijdert een configuratie waarde met cache invalidatie
   */
  async deleteConfigValue(serverId: string, key: string): Promise<void> {
    await this.repository.delete({ serverId, key });
    
    const cacheKey = this.getConfigCacheKey(serverId, key);
    await this.clearCache(cacheKey);

    // Clear server config cache ook
    await this.clearServerConfigCache(serverId);
  }

  /**
   * Helper voor config-specifieke cache key generatie
   */
  private getConfigCacheKey(serverId: string, key: string): string {
    return `${this.cacheKeyPrefix}:${serverId}:${key}`;
  }

  /**
   * Helper voor server config cache key generatie
   */
  private getServerConfigCacheKey(serverId: string): string {
    return `${SERVER_CONFIG_PREFIX}:${serverId}`;
  }

  /**
   * Helper voor server config cache invalidatie
   */
  private async clearServerConfigCache(serverId: string): Promise<void> {
    const cacheKey = this.getServerConfigCacheKey(serverId);
    await this.redisClient.del(cacheKey);
  }

  // Implementeer abstracte methode van BaseRepository
  protected getCacheKey(id: string): string {
    return `${this.cacheKeyPrefix}:id:${id}`;
  }
}