import { Repository, EntityTarget, In } from 'typeorm';
import { ConfigEntity } from '@v2/atomic/atoms/database/entities/ConfigEntity';
import { BaseRepositoryImpl } from '../BaseRepositoryImpl';
import { CacheProvider, Cacheable, InvalidateCache } from '@v2/core/cache';

export type ConfigType = ConfigEntity['type'];
export type ConfigValue = string | number | boolean | Record<string, unknown>;

/**
 * Config repository implementation with caching support
 */
export class ConfigRepositoryImpl extends BaseRepositoryImpl<ConfigEntity> {
  constructor(
    repository: Repository<ConfigEntity>,
    cacheProvider: CacheProvider
  ) {
    super(
      repository,
      'Config',
      ConfigEntity as EntityTarget<ConfigEntity>,
      cacheProvider
    );
  }

  /**
   * Find configuration by key for a server
   */
  @Cacheable({ keyPrefix: 'server-config', strategy: 'cache-aside', ttl: 3600 })
  async findByKey(
    serverId: string,
    key: string
  ): Promise<ConfigEntity | null> {
    const configs = await this.find({ serverId, key });
    return configs[0] || null;
  }

  /**
   * Get typed configuration value
   */
  @Cacheable({ keyPrefix: 'config-value', strategy: 'cache-aside', ttl: 3600 })
  async getValue<T extends ConfigValue>(
    serverId: string,
    key: string,
    defaultValue?: T
  ): Promise<T | null> {
    const config = await this.findByKey(serverId, key);
    
    if (!config) {
      return defaultValue ?? null;
    }

    return config.getTypedValue<T>();
  }

  /**
   * Get multiple configuration values
   */
  @Cacheable({ keyPrefix: 'multi-config', strategy: 'cache-aside', ttl: 3600 })
  async getMultipleValues(
    serverId: string,
    keys: string[]
  ): Promise<Record<string, ConfigValue>> {
    const configs = await this.find({
      serverId,
      key: In(keys)
    });

    const result: Record<string, ConfigValue> = {};
    
    for (const config of configs) {
      result[config.key] = config.getTypedValue();
    }

    return result;
  }

  /**
   * Set configuration value with validation
   */
  @InvalidateCache()
  async setValue(
    serverId: string,
    key: string,
    value: ConfigValue,
    type: ConfigType
  ): Promise<ConfigEntity | null> {
    let config = await this.findByKey(serverId, key);
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (config) {
      config.value = stringValue;
      config.type = type;
      
      if (!config.isValid()) {
        throw new Error(`Invalid value for config ${key} of type ${type}`);
      }

      return this.update(config.id, config);
    }

    config = this.repository.create({
      key,
      value: stringValue,
      type,
      serverId
    });

    if (!config.isValid()) {
      throw new Error(`Invalid value for config ${key} of type ${type}`);
    }

    return this.create(config);
  }

  /**
   * Get all system configurations
   */
  @Cacheable({ keyPrefix: 'system-configs', strategy: 'cache-aside', ttl: 3600 })
  async getSystemConfigs(serverId: string): Promise<ConfigEntity[]> {
    return this.find({
      serverId,
      isSystem: true
    });
  }

  /**
   * Reset configuration to default value
   */
  @InvalidateCache()
  async resetToDefault(
    serverId: string,
    key: string
  ): Promise<ConfigEntity | null> {
    const config = await this.findByKey(serverId, key);
    
    if (!config || !config.defaultValue) {
      return null;
    }

    if (!config.resetToDefault()) {
      return null;
    }

    return this.update(config.id, config);
  }

  /**
   * Bulk update configurations
   */
  @InvalidateCache()
  async bulkUpdate(
    serverId: string,
    configs: Array<{ key: string; value: ConfigValue; type: ConfigType }>
  ): Promise<void> {
    await this.withTransaction(async () => {
      for (const config of configs) {
        await this.setValue(serverId, config.key, config.value, config.type);
      }
    });
  }

  /**
   * Delete configuration if not system
   */
  @InvalidateCache()
  async deleteIfNotSystem(
    serverId: string,
    key: string
  ): Promise<boolean> {
    const config = await this.findByKey(serverId, key);
    
    if (!config || config.isSystem) {
      return false;
    }

    return this.softDelete(config.id);
  }

  /**
   * Find configurations by type
   */
  @Cacheable({ keyPrefix: 'typed-configs', strategy: 'cache-aside', ttl: 3600 })
  async findByType(
    serverId: string,
    type: ConfigType
  ): Promise<ConfigEntity[]> {
    return this.find({ serverId, type });
  }

  /**
   * Find encrypted configurations
   */
  @Cacheable({ keyPrefix: 'encrypted-configs', strategy: 'cache-aside', ttl: 3600 })
  async findEncrypted(serverId: string): Promise<ConfigEntity[]> {
    return this.find({ serverId, isEncrypted: true });
  }
}