import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '../../../../atoms/discord/types';
import { Validate } from '../../../../atoms/discord/decorators';
import { RegisterCommand } from '../../command-registry';
import { TaskManagementService } from '../../../../molecules/task/services/TaskManagementService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

// Slash command builder voor de opties
const commandBuilder = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Beheer taken')
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Werk de status van een taak bij')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Het ID van de taak')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('status')
          .setDescription('De nieuwe status van de taak')
          .setRequired(true)
          .addChoices(
            { name: 'Open', value: TaskStatus.PENDING },
            { name: 'In uitvoering', value: TaskStatus.IN_PROGRESS },
            { name: 'Voltooid', value: TaskStatus.COMPLETED }
          )
      )
  );

const meta: CommandMeta = {
  name: 'task status',
  description: 'Werk de status van een taak bij',
  permissions: [PermissionFlagsBits.SendMessages]
};

@RegisterCommand(meta)
export class TaskStatusCommand implements Command {
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

    // Controleer of de gebruiker de taak mag bijwerken
    // Alleen de persoon aan wie de taak is toegewezen of iemand met ManageMessages permissie
    if (task.assigneeId !== interaction.user.id && 
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return {
        isValid: false,
        error: 'Je hebt geen toestemming om de status van deze taak te wijzigen'
      };
    }

    return { isValid: true };
  }

  @Validate()
  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const taskId = interaction.options.getString('id', true);
      const newStatus = interaction.options.getString('status', true) as TaskStatus;

      const task = await this.taskService.updateTaskStatus(
        taskId,
        newStatus,
        interaction.guildId!,
        interaction.user.id
      );

      // Bepaal het emoji voor de nieuwe status
      const statusEmoji = newStatus === TaskStatus.COMPLETED ? '✅' : 
                         newStatus === TaskStatus.IN_PROGRESS ? '⏳' : '📝';

      await interaction.reply({
        content: `${statusEmoji} Status van taak "${task.title}" is bijgewerkt naar ${newStatus.toLowerCase()}!`,
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