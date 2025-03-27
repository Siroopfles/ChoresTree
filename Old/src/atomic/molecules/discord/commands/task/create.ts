import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '../../../../atoms/discord/types';
import { Validate, RequirePermissions } from '../../../../atoms/discord/decorators';
import { RegisterCommand } from '../../command-registry';
import { TaskManagementService } from '../../../../molecules/task/services/TaskManagementService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core';

// Maak een slash command builder voor de opties
const commandBuilder = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Beheer taken')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Maak een nieuwe taak aan')
      .addStringOption(option =>
        option
          .setName('naam')
          .setDescription('De naam van de taak')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('beschrijving')
          .setDescription('De beschrijving van de taak')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('deadline')
          .setDescription('De deadline van de taak (YYYY-MM-DD)')
          .setRequired(false)
      )
      .addUserOption(option =>
        option
          .setName('assignee')
          .setDescription('De persoon aan wie de taak wordt toegewezen')
          .setRequired(false)
      )
  );

const meta: CommandMeta = {
  name: 'task create',
  description: 'Maak een nieuwe taak aan',
  permissions: [PermissionFlagsBits.ManageMessages]
};

@RegisterCommand(meta)
export class TaskCreateCommand implements Command {
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

    const deadline = interaction.options.getString('deadline');
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return {
          isValid: false,
          error: 'Ongeldige deadline datum. Gebruik het formaat YYYY-MM-DD'
        };
      }
    }

    return { isValid: true };
  }

  @RequirePermissions([PermissionFlagsBits.ManageMessages])
  @Validate()
  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const title = interaction.options.getString('naam', true);
      const description = interaction.options.getString('beschrijving', true);
      const deadlineStr = interaction.options.getString('deadline');
      const assignee = interaction.options.getUser('assignee');

      const deadline = deadlineStr ? new Date(deadlineStr) : undefined;

      const task = await this.taskService.createTask({
        title,
        description,
        assigneeId: assignee?.id ?? interaction.user.id,
        serverId: interaction.guildId!,
        deadline
      });

      await interaction.reply({
        content: `✅ Taak "${task.title}" is aangemaakt! ID: ${task.id}`,
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