import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '../../../../atoms/discord/types';
import { Validate, RequirePermissions } from '../../../../atoms/discord/decorators';
import { RegisterCommand } from '../../command-registry';
import { TaskManagementService } from '../../../../molecules/task/services/TaskManagementService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core';
import { TaskPriority } from '@/atomic/atoms/database/interfaces/Task';

interface TaskUpdateData {
  title?: string;
  description?: string;
  deadline?: Date;
  priority?: TaskPriority;
}

// Slash command builder voor de opties
const commandBuilder = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Beheer taken')
  .addSubcommand(subcommand =>
    subcommand
      .setName('update')
      .setDescription('Werk een bestaande taak bij')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Het ID van de taak')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('naam')
          .setDescription('De nieuwe naam van de taak')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('beschrijving')
          .setDescription('De nieuwe beschrijving van de taak')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('deadline')
          .setDescription('De nieuwe deadline van de taak (YYYY-MM-DD)')
          .setRequired(false)
      )
  );

const meta: CommandMeta = {
  name: 'task update',
  description: 'Werk een bestaande taak bij',
  permissions: [PermissionFlagsBits.ManageMessages]
};

@RegisterCommand(meta)
export class TaskUpdateCommand implements Command {
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
      const taskId = interaction.options.getString('id', true);
      const title = interaction.options.getString('naam');
      const description = interaction.options.getString('beschrijving');
      const deadlineStr = interaction.options.getString('deadline');

      // Check of er überhaupt iets is om te updaten
      if (!title && !description && !deadlineStr) {
        await interaction.reply({
          content: '❌ Je moet minimaal één veld opgeven om te wijzigen.',
          ephemeral: true
        });
        return;
      }

      const updateData: TaskUpdateData = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (deadlineStr) updateData.deadline = new Date(deadlineStr);

      const task = await this.taskService.updateTask(
        taskId,
        updateData,
        interaction.guildId!
      );

      await interaction.reply({
        content: `✅ Taak "${task.title}" is bijgewerkt!`,
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