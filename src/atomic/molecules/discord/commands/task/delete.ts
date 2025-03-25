import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '../../../../atoms/discord/types';
import { Validate, RequirePermissions } from '../../../../atoms/discord/decorators';
import { RegisterCommand } from '../../command-registry';
import { TaskManagementService } from '../../../../molecules/task/services/TaskManagementService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core';

// Slash command builder voor de opties
const commandBuilder = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Beheer taken')
  .addSubcommand(subcommand =>
    subcommand
      .setName('delete')
      .setDescription('Verwijder een taak')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Het ID van de taak om te verwijderen')
          .setRequired(true)
      )
  );

const meta: CommandMeta = {
  name: 'task delete',
  description: 'Verwijder een taak',
  permissions: [PermissionFlagsBits.ManageMessages]
};

@RegisterCommand(meta)
export class TaskDeleteCommand implements Command {
  public meta: CommandMeta = meta;
  private taskService: TaskManagementService;

  constructor() {
    const db = DatabaseService.getInstance();
    this.taskService = TaskManagementService.getInstance(
      db.getTaskRepository(),
      eventBus
    );
  }

  public async validate(interaction: ChatInputCommandInteraction): Promise<ValidationResult> {
    if (!interaction.guildId) {
      return {
        isValid: false,
        error: 'Dit command kan alleen in servers gebruikt worden'
      };
    }

    // Controleer of de taak bestaat voordat we proberen te verwijderen
    const taskId = interaction.options.getString('id', true);
    const task = await this.taskService.getTaskById(taskId, interaction.guildId);
    
    if (!task) {
      return {
        isValid: false,
        error: 'Taak niet gevonden'
      };
    }

    return { isValid: true };
  }

  @RequirePermissions([PermissionFlagsBits.ManageMessages])
  @Validate()
  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const taskId = interaction.options.getString('id', true);
      
      // Haal de taak op voor de bevestigingsboodschap
      const task = await this.taskService.getTaskById(taskId, interaction.guildId!);
      
      await this.taskService.deleteTask(taskId, interaction.guildId!);

      await interaction.reply({
        content: `✅ Taak "${task!.title}" is verwijderd!`,
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

// Export de command builder voor registratie
export const command = commandBuilder;