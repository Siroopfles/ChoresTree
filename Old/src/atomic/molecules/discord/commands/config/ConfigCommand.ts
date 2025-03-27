import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types';
import { RegisterCommand } from '../../command-registry';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';
import { eventBus } from '@/core/eventBus';

// Import subcommands
import { ConfigSettingsCommand } from './settings/ConfigSettingsCommand';
import { ConfigPermissionsCommand } from './permissions/ConfigPermissionsCommand';
import { ConfigCustomizeCommand } from './customize/ConfigCustomizeCommand';
import { ConfigAuditCommand } from './audit/ConfigAuditCommand';
import { ConfigViewCommand } from './view/ConfigViewCommand';

type ConfigSubCommand =
  | ConfigSettingsCommand
  | ConfigPermissionsCommand
  | ConfigCustomizeCommand
  | ConfigAuditCommand
  | ConfigViewCommand;

const meta: CommandMeta = {
  name: 'config',
  description: 'Beheer server configuratie en instellingen',
  permissions: ['Administrator'] // Alleen voor admins
};

@RegisterCommand(meta)
export class ConfigCommand implements Command {
  public meta: CommandMeta = meta;
  private settingsRepository: ServerSettingsRepository;
  private subcommands: Map<string, ConfigSubCommand>;

  constructor() {
    this.settingsRepository = new ServerSettingsRepository();

    // Initialiseer alle subcommands met expliciete type annotations
    const subcommandEntries: [string, ConfigSubCommand][] = [
      ['settings', new ConfigSettingsCommand(this.settingsRepository)],
      ['permissions', new ConfigPermissionsCommand(this.settingsRepository)],
      ['customize', new ConfigCustomizeCommand(this.settingsRepository)],
      ['audit', new ConfigAuditCommand()],
      ['view', new ConfigViewCommand(this.settingsRepository)]
    ];

    this.subcommands = new Map(subcommandEntries);
  }

  public async validate(interaction: ChatInputCommandInteraction): Promise<ValidationResult> {
    if (!interaction.guildId) {
      return {
        isValid: false,
        error: 'Dit command kan alleen in servers gebruikt worden'
      };
    }

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = this.subcommands.get(subcommandGroup || '');

    if (!subcommand) {
      return {
        isValid: false,
        error: `Ongeldig subcommand: ${subcommandGroup}`
      };
    }

    // Valideer het subcommand
    if (subcommand.validate) {
      return await subcommand.validate(interaction);
    }

    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const subcommandGroup = interaction.options.getSubcommandGroup();
      const subcommand = this.subcommands.get(subcommandGroup || '');

      if (!subcommand) {
        throw new Error(`Ongeldig subcommand: ${subcommandGroup}`);
      }

      // Voer het subcommand uit
      await subcommand.execute(interaction);

      // Emit configuratie update event
      await eventBus.emit('configurationUpdated', {
        serverId: interaction.guildId,
        updatedBy: interaction.user.id,
        command: subcommandGroup
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true
      });
    }
  }
}

// Export de command builder
export { commandBuilder as command } from './index';