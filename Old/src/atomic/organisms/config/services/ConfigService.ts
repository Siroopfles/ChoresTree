import { DatabaseService } from '@/core/database/DatabaseService';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';
import { ConfigRepository } from '@/atomic/molecules/database/repositories/ConfigRepository';
import { eventBus } from '@/core/eventBus';
import {
  ConfigValueData,
  ConfigPermissionLevel,
  ConfigUpdateEventData,
  CONFIG_EVENTS,
  ConfigPermissionError,
  ServerConfig,
  ConfigValueType,
} from '@/atomic/atoms/config/types/config';
import {
  validateConfigKey,
  validateConfigValue,
  createDefaultValue,
} from '@/atomic/atoms/config/validation/configValidation';

export class ConfigService {
  private static instance: ConfigService;
  private dbService: DatabaseService;
  private configRepository: ConfigRepository;
  private serverSettingsRepository: ServerSettingsRepository;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.configRepository = this.dbService.getConfigRepository();
    this.serverSettingsRepository = this.dbService.getServerSettingsRepository();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Controleert of een gebruiker voldoende rechten heeft voor een configuratie actie
   */
  private async checkPermissionLevel(
    serverId: string,
    userId: string,
    requiredLevel: ConfigPermissionLevel
  ): Promise<boolean> {
    const settings = await this.serverSettingsRepository.getServerSettings(serverId);

    // Admin heeft altijd volledige rechten
    if (settings.adminRoleIds.includes(userId)) {
      return true;
    }

    // Managers hebben schrijfrechten
    if (requiredLevel <= ConfigPermissionLevel.WRITE && settings.managerRoleIds.includes(userId)) {
      return true;
    }

    // Iedereen heeft leesrechten
    return requiredLevel <= ConfigPermissionLevel.READ;
  }

  /**
   * Haalt een configuratie waarde op
   */
  public async getConfig<T>(
    serverId: string,
    key: string,
    userId: string
  ): Promise<T | null> {
    validateConfigKey(key);

    const hasPermission = await this.checkPermissionLevel(
      serverId,
      userId,
      ConfigPermissionLevel.READ
    );

    if (!hasPermission) {
      throw new ConfigPermissionError('Insufficient permissions to read config');
    }

    const config = await this.configRepository.getConfigValue<T>(serverId, key);
    return config?.value ?? null;
  }

  /**
   * Update een configuratie waarde
   */
  public async setConfig<T>(
    serverId: string,
    key: string,
    value: T,
    type: ConfigValueType,
    userId: string
  ): Promise<void> {
    validateConfigKey(key);

    const hasPermission = await this.checkPermissionLevel(
      serverId,
      userId,
      ConfigPermissionLevel.WRITE
    );

    if (!hasPermission) {
      throw new ConfigPermissionError('Insufficient permissions to update config');
    }

    const oldConfig = await this.configRepository.getConfigValue<T>(serverId, key);
    const defaultValue = oldConfig?.defaultValue ?? createDefaultValue(type, value);

    const newConfig: ConfigValueData<T> = {
      key,
      value,
      type,
      defaultValue,
      serverId,
      updatedBy: userId,
    };

    validateConfigValue(newConfig);

    await this.configRepository.updateConfigValue(serverId, key, newConfig);

    const eventData: ConfigUpdateEventData = {
      serverId,
      key,
      oldValue: oldConfig,
      newValue: newConfig,
      updatedBy: userId,
    };

    await eventBus.emit(CONFIG_EVENTS.CONFIG_UPDATED, eventData);
  }

  /**
   * Haalt alle configuratie voor een server op
   */
  public async getServerConfig(
    serverId: string,
    userId: string
  ): Promise<ServerConfig> {
    const hasPermission = await this.checkPermissionLevel(
      serverId,
      userId,
      ConfigPermissionLevel.READ
    );

    if (!hasPermission) {
      throw new ConfigPermissionError('Insufficient permissions to read server config');
    }

    return this.configRepository.getServerConfig(serverId);
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();