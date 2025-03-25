import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core/eventBus';

const meta: CommandMeta = {
  name: 'config customize',
  description: 'Pas server voorkeuren aan',
  permissions: ['Administrator']
};

export class ConfigCustomizeCommand implements Command {
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

    const optie = interaction.options.getString('optie', true);
    const waarde = interaction.options.getString('waarde', true);

    // Valideer specifieke opties
    switch (optie) {
      case 'welcome_message':
        if (waarde.length > 2000) {
          return {
            isValid: false,
            error: 'Welkom bericht mag niet langer zijn dan 2000 tekens'
          };
        }
        break;

      case 'notification_style':
        const validStyles = ['compact', 'detailed', 'minimal'];
        if (!validStyles.includes(waarde)) {
          return {
            isValid: false,
            error: `Ongeldige notificatie stijl. Gebruik één van: ${validStyles.join(', ')}`
          };
        }
        break;
    }

    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const optie = interaction.options.getString('optie', true);
      const waarde = interaction.options.getString('waarde', true);
      const serverId = interaction.guildId!;

      // Haal huidige settings op
      const settings = await this.settingsRepository.getServerSettings(serverId);
      const oldValue = settings[optie as keyof typeof settings];

      // Update de setting
      const updates = { [optie]: waarde };
      await this.settingsRepository.updateServerSettings(serverId, updates);

      // Log de wijziging
      await this.auditLogRepository.logConfigChange(
        serverId,
        optie,
        oldValue,
        waarde,
        interaction.user.id,
        'update'
      );

      // Emit customization update event
      await eventBus.emit('serverCustomization.updated', {
        serverId,
        option: optie,
        oldValue,
        newValue: waarde,
        updatedBy: interaction.user.id
      });

      await interaction.reply({
        content: `✅ Voorkeur \`${optie}\` is bijgewerkt naar: \`${waarde}\``,
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