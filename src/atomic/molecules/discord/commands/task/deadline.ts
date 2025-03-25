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
      .setName('deadline')
      .setDescription('Werk de deadline van een taak bij')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Het ID van de taak')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('datum')
          .setDescription('De nieuwe deadline (YYYY-MM-DD)')
          .setRequired(true)
      )
  );

const meta: CommandMeta = {
  name: 'task deadline',
  description: 'Werk de deadline van een taak bij',
  permissions: [PermissionFlagsBits.ManageMessages]
};

@RegisterCommand(meta)
export class TaskDeadlineCommand implements Command {
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

    const deadline = interaction.options.getString('datum', true);
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return {
        isValid: false,
        error: 'Ongeldige deadline datum. Gebruik het formaat YYYY-MM-DD'
      };
    }

    // Controleer of de deadline niet in het verleden ligt
    if (deadlineDate < new Date()) {
      return {
        isValid: false,
        error: 'De deadline kan niet in het verleden liggen'
      };
    }

    return { isValid: true };
  }

  @RequirePermissions([PermissionFlagsBits.ManageMessages])
  @Validate()
  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const taskId = interaction.options.getString('id', true);
      const deadline = new Date(interaction.options.getString('datum', true));

      const task = await this.taskService.updateTask(
        taskId,
        { deadline },
        interaction.guildId!
      );

      // Format de datum naar een leesbaar formaat
      const formattedDeadline = deadline.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      await interaction.reply({
        content: `✅ Deadline van taak "${task.title}" is bijgewerkt naar ${formattedDeadline}!`,
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