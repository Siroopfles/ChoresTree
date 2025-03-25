import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';

const meta: CommandMeta = {
  name: 'config view',
  description: 'Bekijk server configuratie',
  permissions: ['Administrator']
};

export class ConfigViewCommand implements Command {
  public meta: CommandMeta = meta;

  constructor(
    private readonly settingsRepository: ServerSettingsRepository
  ) {}

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
      const serverId = interaction.guildId!;
      const category = interaction.options.getString('categorie') || 'all';

      // Haal server settings op
      const settings = await this.settingsRepository.getServerSettings(serverId);

      // Maak een embed voor de configuratie
      const embed = new EmbedBuilder()
        .setTitle('Server Configuratie')
        .setColor('#0099ff')
        .setTimestamp();

      switch (category) {
        case 'settings':
          embed.setDescription('Algemene server instellingen')
            .addFields(
              {
                name: 'Notificatie Kanaal',
                value: settings.notificationChannelId ? `<#${settings.notificationChannelId}>` : '_Niet ingesteld_',
                inline: true
              },
              {
                name: 'Tijdzone',
                value: settings.timezone || '_Niet ingesteld_',
                inline: true
              },
              {
                name: 'Standaard Herinnering',
                value: `${settings.defaultReminderFrequency} minuten`,
                inline: true
              },
              {
                name: 'Standaard Prioriteit',
                value: settings.defaultTaskPriority,
                inline: true
              }
            );
          break;

        case 'permissions':
          embed.setDescription('Rol permissies')
            .addFields(
              {
                name: 'Admin Rollen',
                value: settings.adminRoleIds.length > 0 
                  ? settings.adminRoleIds.map(id => `<@&${id}>`).join('\n')
                  : '_Geen admin rollen ingesteld_',
                inline: true
              },
              {
                name: 'Manager Rollen',
                value: settings.managerRoleIds.length > 0
                  ? settings.managerRoleIds.map(id => `<@&${id}>`).join('\n')
                  : '_Geen manager rollen ingesteld_',
                inline: true
              }
            );
          
          // Voeg command permissies toe
          if (Object.keys(settings.commandPermissions).length > 0) {
            embed.addFields({
              name: 'Command Permissies',
              value: Object.entries(settings.commandPermissions)
                .map(([cmd, perms]) => {
                  const allowed = perms.allowedRoles.map(id => `<@&${id}>`).join(', ') || '_geen_';
                  const denied = perms.deniedRoles.map(id => `<@&${id}>`).join(', ') || '_geen_';
                  return `**${cmd}**\nToegestaan: ${allowed}\nGeweigerd: ${denied}`;
                })
                .join('\n\n'),
              inline: false
            });
          }
          break;

        case 'preferences':
          embed.setDescription('Aangepaste voorkeuren')
            .addFields(
              {
                name: 'Categorieën',
                value: settings.customCategories.length > 0
                  ? settings.customCategories.join('\n')
                  : '_Geen aangepaste categorieën_',
                inline: true
              },
              {
                name: 'Ingeschakelde Features',
                value: Object.entries(settings.enabledFeatures)
                  .map(([feature, enabled]) => `${feature}: ${enabled ? '✅' : '❌'}`)
                  .join('\n'),
                inline: true
              }
            );
          break;

        default:
          // Toon alle instellingen
          embed.setDescription('Alle server instellingen')
            .addFields(
              {
                name: '⚙️ Algemene Instellingen',
                value: `Notificatie Kanaal: ${settings.notificationChannelId ? `<#${settings.notificationChannelId}>` : '_Niet ingesteld_'}
Tijdzone: ${settings.timezone}
Standaard Herinnering: ${settings.defaultReminderFrequency} minuten
Standaard Prioriteit: ${settings.defaultTaskPriority}`,
                inline: false
              },
              {
                name: '🔒 Permissies',
                value: `Admin Rollen: ${settings.adminRoleIds.length > 0 ? settings.adminRoleIds.map(id => `<@&${id}>`).join(', ') : '_geen_'}
Manager Rollen: ${settings.managerRoleIds.length > 0 ? settings.managerRoleIds.map(id => `<@&${id}>`).join(', ') : '_geen_'}
Command Permissies: ${Object.keys(settings.commandPermissions).length} commands geconfigureerd`,
                inline: false
              },
              {
                name: '🎨 Voorkeuren',
                value: `Categorieën: ${settings.customCategories.join(', ')}
Features: ${Object.entries(settings.enabledFeatures)
  .filter(([, enabled]) => enabled)
  .map(([feature]) => feature)
  .join(', ')}`,
                inline: false
              }
            );
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
}