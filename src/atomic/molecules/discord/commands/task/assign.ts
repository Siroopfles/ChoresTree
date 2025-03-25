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
      .setName('assign')
      .setDescription('Wijs een taak toe aan een gebruiker')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Het ID van de taak')
          .setRequired(true)
      )
      .addUserOption(option =>
        option
          .setName('gebruiker')
          .setDescription('De gebruiker aan wie de taak wordt toegewezen')
          .setRequired(true)
      )
  );

const meta: CommandMeta = {
  name: 'task assign',
  description: 'Wijs een taak toe aan een gebruiker',
  permissions: [PermissionFlagsBits.ManageMessages]
};

@RegisterCommand(meta)
export class TaskAssignCommand implements Command {
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
      const assignee = interaction.options.getUser('gebruiker', true);

      const task = await this.taskService.assignTask(
        taskId,
        assignee.id,
        interaction.guildId!
      );

      await interaction.reply({
        content: `✅ Taak "${task.title}" is toegewezen aan ${assignee.username}!`,
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