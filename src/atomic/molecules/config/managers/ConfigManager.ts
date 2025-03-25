import { EventBus, eventBus } from '@/core/eventBus';
import { DatabaseService } from '@/core/database/DatabaseService';
import { Redis } from 'ioredis';
import {
  ConfigValueData,
  ConfigPermissionLevel,
  ConfigUpdateEventData,
  ConfigAuditLogEntry,
  CONFIG_EVENTS,
  ConfigPermissionError,
  ServerConfig,
  ConfigValueType,
} from '@/atomic/atoms/config/types/config';
import {
  validateConfigKey,
  validateConfigValue,
  validateServerId,
} from '@/atomic/atoms/config/validation/configValidation';

export class ConfigManager {
  private static instance: ConfigManager;
  private cache: Redis;
  private dbService: DatabaseService;
  private eventBus: EventBus;
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly CACHE_PREFIX = 'config:';

  private constructor(redisClient: Redis) {
    this.cache = redisClient;
    this.dbService = DatabaseService.getInstance();
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  public static getInstance(redisClient: Redis): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(redisClient);
    }
    return ConfigManager.instance;
  }

  private setupEventListeners(): void {
    // Luister naar cache invalidatie events
    this.eventBus.on(CONFIG_EVENTS.CACHE_INVALIDATED, async (serverId: string) => {
      await this.invalidateCache(serverId);
    });
  }

  /**
   * Haalt een configuratie waarde op voor een server
   */
  public async getConfigValue<T>(
    serverId: string,
    key: string,
    type: ConfigValueType,
    requesterPermLevel: ConfigPermissionLevel
  ): Promise<T | null> {
    validateServerId(serverId);
    validateConfigKey(key);

    // Check permissions
    if (requesterPermLevel < ConfigPermissionLevel.READ) {
      throw new ConfigPermissionError('Insufficient permissions to read config');
    }

    // Try cache first
    const cachedValue = await this.getFromCache<ConfigValueData<T>>(serverId, key);
    if (cachedValue) {
      return cachedValue.value;
    }

    // Get from database
    const config = await this.dbService
      .getConfigRepository()
      .getConfigValue<T>(serverId, key);

    if (!config) {
      return null;
    }

    // Verify type matches
    if (config.type !== type) {
      throw new ConfigPermissionError(`Config type mismatch for ${key}`);
    }

    // Cache the result
    await this.setInCache(serverId, key, config);

    return config.value;
  }

  /**
   * Update een configuratie waarde
   */
  public async updateConfigValue<T>(
    serverId: string,
    key: string,
    value: T,
    type: ConfigValueType,
    updatedBy: string,
    requesterPermLevel: ConfigPermissionLevel
  ): Promise<void> {
    validateServerId(serverId);
    validateConfigKey(key);

    // Check permissions
    if (requesterPermLevel < ConfigPermissionLevel.WRITE) {
      throw new ConfigPermissionError('Insufficient permissions to update config');
    }

    // Prepare config data
    const configData: ConfigValueData<T> = {
      key,
      value,
      type,
      defaultValue: value, // Bij nieuwe waarden is default gelijk aan value
      serverId,
      updatedBy,
    };

    // Validate new value
    validateConfigValue(configData);

    // Get existing config for audit
    const oldConfig = await this.dbService
      .getConfigRepository()
      .getConfigValue<T>(serverId, key);

    // Update in database
    await this.dbService
      .getConfigRepository()
      .updateConfigValue(serverId, key, configData);

    // Create audit log entry
    const auditEntry: ConfigAuditLogEntry = {
      serverId,
      key,
      oldValue: oldConfig?.value ?? null,
      newValue: value,
      updatedBy,
      timestamp: new Date(),
      action: oldConfig ? 'update' : 'create',
    };

    // Log audit entry
    await this.dbService
      .getConfigRepository()
      .createAuditLogEntry(auditEntry);

    // Emit update event
    const eventData: ConfigUpdateEventData = {
      serverId,
      key,
      oldValue: oldConfig,
      newValue: configData,
      updatedBy,
    };
    await this.eventBus.emit(CONFIG_EVENTS.CONFIG_UPDATED, eventData);

    // Invalidate cache
    await this.invalidateCache(serverId);
  }

  /**
   * Haalt alle configuratie voor een server op
   */
  public async getServerConfig(
    serverId: string,
    requesterPermLevel: ConfigPermissionLevel
  ): Promise<ServerConfig> {
    validateServerId(serverId);

    if (requesterPermLevel < ConfigPermissionLevel.READ) {
      throw new ConfigPermissionError('Insufficient permissions to read config');
    }

    return this.dbService
      .getConfigRepository()
      .getServerConfig(serverId);
  }

  private async getFromCache<T>(serverId: string, key: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(serverId, key);
    const cached = await this.cache.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async setInCache<T>(
    serverId: string,
    key: string,
    value: T
  ): Promise<void> {
    const cacheKey = this.getCacheKey(serverId, key);
    await this.cache.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(value)
    );
  }

  private async invalidateCache(serverId: string): Promise<void> {
    const pattern = this.getCacheKey(serverId, '*');
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
  }

  private getCacheKey(serverId: string, key: string): string {
    return `${this.CACHE_PREFIX}${serverId}:${key}`;
  }
}