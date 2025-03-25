import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '../../../../atoms/discord/types';
import { Validate } from '../../../../atoms/discord/decorators';
import { RegisterCommand } from '../../command-registry';
import { TaskManagementService } from '../../../../molecules/task/services/TaskManagementService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core';
import { ITask, TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

// Slash command builder voor de opties
const commandBuilder = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Beheer taken')
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('Toon een lijst van taken')
      .addStringOption(option =>
        option
          .setName('filter')
          .setDescription('Filter taken op status')
          .setRequired(false)
          .addChoices(
            { name: 'Openstaand', value: TaskStatus.PENDING },
            { name: 'In uitvoering', value: TaskStatus.IN_PROGRESS },
            { name: 'Voltooid', value: TaskStatus.COMPLETED },
            { name: 'Te laat', value: 'overdue' }
          )
      )
      .addUserOption(option =>
        option
          .setName('assignee')
          .setDescription('Filter taken op toegewezen persoon')
          .setRequired(false)
      )
  );

const meta: CommandMeta = {
  name: 'task list',
  description: 'Toon een lijst van taken',
  permissions: [PermissionFlagsBits.SendMessages]
};

@RegisterCommand(meta)
export class TaskListCommand implements Command {
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
    return { isValid: true };
  }

  private formatDate(date: Date | undefined): string {
    if (!date) return 'Geen deadline';
    return new Date(date).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private createTaskEmbed(tasks: ITask[], filter?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Taken Overzicht')
      .setTimestamp();

    if (tasks.length === 0) {
      embed.setDescription('Geen taken gevonden');
      return embed;
    }

    const filterText = filter ? `Filter: ${filter}\n\n` : '';
    embed.setDescription(filterText);

    tasks.forEach(task => {
      const deadline = this.formatDate(task.deadline);
      const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED;
      const status = task.status === TaskStatus.COMPLETED ? '✅' :
                    task.status === TaskStatus.IN_PROGRESS ? '⏳' :
                    isOverdue ? '⚠️' : '📝';

      embed.addFields({
        name: `${status} ${task.title} (ID: ${task.id})`,
        value: `**Beschrijving:** ${task.description}\n**Deadline:** ${deadline}\n**Toegewezen aan:** <@${task.assigneeId}>\n**Status:** ${task.status}`
      });
    });

    return embed;
  }

  @Validate()
  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const filter = interaction.options.getString('filter');
      const assignee = interaction.options.getUser('assignee');
      const serverId = interaction.guildId!;

      let tasks;

      if (assignee) {
        tasks = await this.taskService.getTasksByAssignee(assignee.id, serverId);
      } else if (filter === 'overdue') {
        tasks = await this.taskService.getOverdueTasks(serverId);
      } else if (filter) {
        tasks = (await this.taskService.getPendingTasks(serverId))
          .filter(task => task.status === filter);
      } else {
        tasks = await this.taskService.getPendingTasks(serverId);
      }

      const embed = this.createTaskEmbed(
        tasks,
        filter || (assignee ? `Toegewezen aan ${assignee.username}` : undefined)
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
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