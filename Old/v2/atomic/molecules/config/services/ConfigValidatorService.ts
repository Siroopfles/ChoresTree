import { IConfigValidator, ServerConfig, ConfigValidationResult, ConfigScope } from '../../../atoms/config/types';

export class ConfigValidatorService implements IConfigValidator {
  validate(config: Partial<ServerConfig>): ConfigValidationResult {
    const errors = [];

    if (config.settings) {
      // Validate settings
      if (config.settings.prefix && (config.settings.prefix.length < 1 || config.settings.prefix.length > 3)) {
        errors.push({
          field: 'settings.prefix',
          message: 'Prefix must be between 1 and 3 characters',
          scope: ConfigScope.SERVER,
          value: config.settings.prefix
        });
      }

      if (config.settings.language && !this.isValidLanguage(config.settings.language)) {
        errors.push({
          field: 'settings.language',
          message: 'Invalid language code',
          scope: ConfigScope.SERVER,
          value: config.settings.language
        });
      }

      if (config.settings.timezone && !this.isValidTimezone(config.settings.timezone)) {
        errors.push({
          field: 'settings.timezone',
          message: 'Invalid timezone',
          scope: ConfigScope.SERVER,
          value: config.settings.timezone
        });
      }

      // Validate notification settings
      if (config.settings.notifications) {
        if (typeof config.settings.notifications.enabled !== 'boolean') {
          errors.push({
            field: 'settings.notifications.enabled',
            message: 'Notifications enabled must be a boolean',
            scope: ConfigScope.SERVER,
            value: config.settings.notifications.enabled
          });
        }

        if (config.settings.notifications.channel && 
            !this.isValidDiscordChannelId(config.settings.notifications.channel)) {
          errors.push({
            field: 'settings.notifications.channel',
            message: 'Invalid Discord channel ID',
            scope: ConfigScope.CHANNEL,
            value: config.settings.notifications.channel
          });
        }
      }
    }

    if (config.customization) {
      // Validate colors
      if (config.customization.colors) {
        for (const [key, value] of Object.entries(config.customization.colors)) {
          if (!this.isValidHexColor(value)) {
            errors.push({
              field: `customization.colors.${key}`,
              message: 'Invalid hex color code',
              scope: ConfigScope.SERVER,
              value
            });
          }
        }
      }

      // Validate emojis
      if (config.customization.emojis) {
        for (const [key, value] of Object.entries(config.customization.emojis)) {
          if (!this.isValidDiscordEmoji(value)) {
            errors.push({
              field: `customization.emojis.${key}`,
              message: 'Invalid Discord emoji',
              scope: ConfigScope.SERVER,
              value
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  validateScope(scope: ConfigScope, value: unknown): ConfigValidationResult {
    const errors = [];

    switch (scope) {
      case ConfigScope.SERVER:
        if (typeof value !== 'string' || !this.isValidDiscordServerId(value as string)) {
          errors.push({
            field: 'serverId',
            message: 'Invalid Discord server ID',
            scope: ConfigScope.SERVER,
            value
          });
        }
        break;

      case ConfigScope.CHANNEL:
        if (typeof value !== 'string' || !this.isValidDiscordChannelId(value as string)) {
          errors.push({
            field: 'channelId',
            message: 'Invalid Discord channel ID',
            scope: ConfigScope.CHANNEL,
            value
          });
        }
        break;

      case ConfigScope.ROLE:
        if (typeof value !== 'string' || !this.isValidDiscordRoleId(value as string)) {
          errors.push({
            field: 'roleId',
            message: 'Invalid Discord role ID',
            scope: ConfigScope.ROLE,
            value
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private isValidLanguage(lang: string): boolean {
    const validLanguages = ['en', 'nl', 'de', 'fr', 'es'];
    return validLanguages.includes(lang.toLowerCase());
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  private isValidDiscordServerId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  private isValidDiscordChannelId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  private isValidDiscordRoleId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  private isValidDiscordEmoji(emoji: string): boolean {
    // Support both Unicode emojis and Discord custom emojis
    return /^(\p{Emoji_Presentation}|\d{17,19})$/u.test(emoji);
  }
}