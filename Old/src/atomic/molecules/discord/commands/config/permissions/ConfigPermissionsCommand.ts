import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core/eventBus';

const meta: CommandMeta = {
  name: 'config permissions',
  description: 'Beheer rol permissies voor commands',
  permissions: ['Administrator']
};

export class ConfigPermissionsCommand implements Command {
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

    const role = interaction.options.getRole('role', true);
    const command = interaction.options.getString('command', true);
    const access = interaction.options.getString('toegang', true);

    // Valideer of de rol bestaat en geen @everyone is
    if (role.id === interaction.guild?.id) {
      return {
        isValid: false,
        error: 'Je kunt geen permissies instellen voor @everyone'
      };
    }

    // Valideer of het command bestaat
    const commands = interaction.client.application?.commands.cache;
    if (!commands?.some(cmd => cmd.name === command.split(' ')[0])) {
      return {
        isValid: false,
        error: `Ongeldig command: ${command}`
      };
    }

    if (!['allow', 'deny'].includes(access)) {
      return {
        isValid: false,
        error: 'Toegang moet "allow" of "deny" zijn'
      };
    }

    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const role = interaction.options.getRole('role', true);
      const command = interaction.options.getString('command', true);
      const access = interaction.options.getString('toegang', true) as 'allow' | 'deny';
      const serverId = interaction.guildId!;

      // Haal huidige settings op
      const settings = await this.settingsRepository.getServerSettings(serverId);
      
      // Initialiseer commandPermissions als het nog niet bestaat
      if (!settings.commandPermissions) {
        settings.commandPermissions = {};
      }

      // Update permissies
      const commandPermissions = settings.commandPermissions || {};
      const oldPermissions = { ...commandPermissions[command] };
      
      if (!commandPermissions[command]) {
        commandPermissions[command] = { 
          allowedRoles: [], 
          deniedRoles: [] 
        };
      }

      // Verwijder rol uit tegenovergestelde lijst als die bestaat
      if (access === 'allow') {
        commandPermissions[command].deniedRoles = commandPermissions[command].deniedRoles
          .filter((id: string) => id !== role.id);
        if (!commandPermissions[command].allowedRoles.includes(role.id)) {
          commandPermissions[command].allowedRoles.push(role.id);
        }
      } else {
        commandPermissions[command].allowedRoles = commandPermissions[command].allowedRoles
          .filter((id: string) => id !== role.id);
        if (!commandPermissions[command].deniedRoles.includes(role.id)) {
          commandPermissions[command].deniedRoles.push(role.id);
        }
      }

      // Update settings
      await this.settingsRepository.updateServerSettings(serverId, {
        commandPermissions
      });

      // Log de wijziging
      await this.auditLogRepository.logConfigChange(
        serverId,
        `permission_${command}_${role.id}`,
        oldPermissions,
        commandPermissions[command],
        interaction.user.id,
        'update'
      );

      // Emit permissions update event
      await eventBus.emit('permissions.updated', {
        serverId,
        command,
        role: role.id,
        access,
        updatedBy: interaction.user.id
      });

      await interaction.reply({
        content: `✅ Permissies voor command \`${command}\` zijn bijgewerkt voor rol ${role.name}`,
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