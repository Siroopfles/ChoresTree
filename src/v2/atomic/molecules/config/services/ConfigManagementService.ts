import { EventEmitter } from 'events';
import { IConfigRepository, ServerConfig, ConfigValidationError, ConfigScope } from '../../../atoms/config/types';
import { ConfigValidatorService } from './ConfigValidatorService';

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly errors?: ConfigValidationError[]
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

interface ConfigUpdateEvent {
  serverId: string;
  userId: string;
  oldConfig?: Partial<ServerConfig>;
  newConfig: Partial<ServerConfig>;
}

export class ConfigManagementService {
  private eventBus: EventEmitter;

  constructor(
    private readonly configRepo: IConfigRepository,
    private readonly validator: ConfigValidatorService,
    eventBus: EventEmitter
  ) {
    this.eventBus = eventBus;
  }

  async getServerConfig(serverId: string): Promise<ServerConfig> {
    try {
      return await this.configRepo.getServerConfig(serverId);
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(`Failed to fetch server config: ${error.message}`);
      }
      throw error;
    }
  }

  async updateServerConfig(
    serverId: string,
    userId: string,
    configUpdate: Partial<ServerConfig>
  ): Promise<void> {
    // Validate update
    const validationResult = this.validator.validate(configUpdate);
    if (!validationResult.isValid && validationResult.errors) {
      throw new ConfigurationError('Invalid configuration', validationResult.errors);
    }

    try {
      // Get current config for audit and event purposes
      let oldConfig: ServerConfig | undefined;
      try {
        oldConfig = await this.configRepo.getServerConfig(serverId);
      } catch {
        // Server might not have config yet, continue with update
      }

      // Update config
      await this.configRepo.updateServerConfig(serverId, configUpdate);

      // Log audit event
      await this.configRepo.logAuditEvent({
        serverId,
        userId,
        action: oldConfig ? 'update' : 'create',
        scope: ConfigScope.SERVER,
        oldValue: oldConfig ? {
          value: oldConfig,
          scope: ConfigScope.SERVER,
          lastUpdated: new Date(),
          updatedBy: userId
        } : undefined,
        newValue: {
          value: configUpdate,
          scope: ConfigScope.SERVER,
          lastUpdated: new Date(),
          updatedBy: userId
        }
      });

      // Emit config update event
      const updateEvent: ConfigUpdateEvent = {
        serverId,
        userId,
        oldConfig,
        newConfig: configUpdate
      };
      
      this.eventBus.emit('serverConfigUpdated', updateEvent);

    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(`Failed to update server config: ${error.message}`);
      }
      throw error;
    }
  }

  async resetServerConfig(serverId: string, userId: string): Promise<void> {
    const defaultConfig: ServerConfig = {
      serverId,
      version: '2.0.0', // Initial v2 version
      settings: {
        prefix: '!',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          enabled: true
        }
      },
      customization: {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          error: '#dc3545'
        },
        emojis: {}
      }
    };

    try {
      await this.updateServerConfig(serverId, userId, defaultConfig);
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(`Failed to reset server config: ${error.message}`);
      }
      throw error;
    }
  }

  async validateConfigUpdate(update: Partial<ServerConfig>): Promise<ConfigValidationError[] | undefined> {
    const result = this.validator.validate(update);
    return result.errors;
  }
}