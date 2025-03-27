import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core/eventBus';

const meta: CommandMeta = {
  name: 'config settings',
  description: 'Beheer server instellingen',
  permissions: ['Administrator']
};

export class ConfigSettingsCommand implements Command {
  public meta: CommandMeta = meta;

  constructor(
    private readonly settingsRepository: ServerSettingsRepository,
    private readonly auditLogRepository = DatabaseService.getInstance().getConfigAuditLogRepository()
  ) {}

  public async validate(interaction: ChatInputCommandInteraction): Promise<ValidationResult> {
    if (!interaction.guildId) {
      return {
        isValid: false,
        error: 'Dit command kan alleen in servers gebruikt worden'
      };
    }

    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('waarde', true);

    // Valideer specifieke settings
    switch (setting) {
      case 'notification_channel':
        const channel = interaction.guild?.channels.cache.get(value);
        if (!channel) {
          return {
            isValid: false,
            error: 'Ongeldig kanaal ID'
          };
        }
        break;

      case 'language':
        const validLanguages = ['nl', 'en'];
        if (!validLanguages.includes(value)) {
          return {
            isValid: false,
            error: 'Ongeldige taal. Gebruik: nl of en'
          };
        }
        break;
    }

    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const setting = interaction.options.getString('setting', true);
      const value = interaction.options.getString('waarde', true);
      const serverId = interaction.guildId!;

      // Haal huidige settings op
      const currentSettings = await this.settingsRepository.getServerSettings(serverId);
      const oldValue = currentSettings[setting as keyof typeof currentSettings];

      // Update de setting
      const updates = { [setting]: value };
      await this.settingsRepository.updateServerSettings(serverId, updates);

      // Log de wijziging via repository
      await this.auditLogRepository.logConfigChange(
        serverId,
        setting,
        oldValue,
        value,
        interaction.user.id,
        'update'
      );
      // Emit setting update event
      await eventBus.emit('serverSettings.updated', {
        serverId,
        setting,
        oldValue,
        newValue: value,
        updatedBy: interaction.user.id
      });

      await interaction.reply({
        content: `✅ Instelling \`${setting}\` is bijgewerkt naar: \`${value}\``,
        ephemeral: true
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true
      });
    }
  }
}