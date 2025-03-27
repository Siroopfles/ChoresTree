import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types';
import { DatabaseService } from '@/core/database/DatabaseService';
import { ConfigAuditLogRepository } from '@/atomic/molecules/database/repositories/ConfigAuditLogRepository';

const meta: CommandMeta = {
  name: 'config audit',
  description: 'Bekijk configuratie wijzigingen',
  permissions: ['Administrator']
};

export class ConfigAuditCommand implements Command {
  public meta: CommandMeta = meta;
  private readonly auditLogRepository: ConfigAuditLogRepository;

  constructor() {
    this.auditLogRepository = DatabaseService.getInstance().getConfigAuditLogRepository();
  }

  public async validate(interaction: ChatInputCommandInteraction): Promise<ValidationResult> {
    if (!interaction.guildId) {
      return {
        isValid: false,
        error: 'Dit command kan alleen in servers gebruikt worden'
      };
    }

    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const type = interaction.options.getString('type') || 'all';
      const serverId = interaction.guildId!;

      // Haal audit logs op
      const logs = await this.auditLogRepository.getAuditLogs(serverId, {
        key: type !== 'all' ? type : undefined,
        limit: 10
      });

      if (logs.length === 0) {
        await interaction.reply({
          content: '❌ Geen configuratie wijzigingen gevonden.',
          ephemeral: true
        });
        return;
      }

      // Maak een embed voor de audit logs
      const embed = new EmbedBuilder()
        .setTitle('Configuratie Wijzigingen')
        .setColor('#0099ff')
        .setDescription(`Laatste ${logs.length} wijzigingen${type !== 'all' ? ` voor type: ${type}` : ''}`)
        .setTimestamp();

      // Voeg elke wijziging toe aan de embed
      for (const log of logs) {
        const oldValue = this.formatValue(log.oldValue);
        const newValue = this.formatValue(log.newValue);
        const timestamp = new Date(log.createdAt).toLocaleString('nl-NL');

        embed.addFields({
          name: `${this.formatAction(log.action)} - ${log.key}`,
          value: `**Wanneer:** ${timestamp}
**Door:** <@${log.updatedBy}>
**Oude waarde:** ${oldValue}
**Nieuwe waarde:** ${newValue}`,
          inline: false
        });
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true
      });
    }
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '_Niet ingesteld_';
    }

    if (typeof value === 'object') {
      return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
    }

    return String(value);
  }

  private formatAction(action: 'update' | 'delete' | 'create'): string {
    const icons = {
      update: '📝',
      delete: '🗑️',
      create: '✨'
    };

    return `${icons[action]} ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  }
}