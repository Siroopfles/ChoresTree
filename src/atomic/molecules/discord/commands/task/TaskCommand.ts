import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types/command';
import { RegisterCommand } from '../../command-registry';
import { TaskManagementService } from '@/atomic/molecules/task/services/TaskManagementService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { eventBus } from '@/core';

// Import subcommands
import { TaskCreateCommand } from './create';
import { TaskListCommand } from './list';
import { TaskAssignCommand } from './assign';
import { TaskStatusCommand } from './status';
import { TaskUpdateCommand } from './update';
import { TaskDeleteCommand } from './delete';
import { TaskDeadlineCommand } from './deadline';

type TaskSubCommand =
  | TaskCreateCommand
  | TaskListCommand
  | TaskAssignCommand
  | TaskStatusCommand
  | TaskUpdateCommand
  | TaskDeleteCommand
  | TaskDeadlineCommand;

const meta: CommandMeta = {
  name: 'task',
  description: 'Beheer taken en toewijzingen',
  aliases: ['t', 'tasks'],
  group: 'taken',
  cooldown: 5, // 5 seconden cooldown tussen commands
  help: {
    description: 'Systeem voor het beheren van taken en toewijzingen',
    category: 'Taken',
    usage: [
      {
        example: '/task create [naam] [beschrijving]',
        description: 'Maak een nieuwe taak aan'
      },
      {
        example: '/task list',
        description: 'Bekijk alle openstaande taken'
      },
      {
        example: '/task complete [id]',
        description: 'Markeer een taak als afgerond'
      },
      {
        example: '/task assign [id] [@gebruiker]',
        description: 'Wijs een taak toe aan een gebruiker'
      }
    ],
    subcommands: {
      create: {
        description: 'Maak een nieuwe taak aan',
        usage: [
          {
            example: '/task create Afwassen "Afwas van vanavond"',
            description: 'Maak een nieuwe afwas taak aan'
          }
        ]
      },
      list: {
        description: 'Bekijk alle openstaande taken',
        usage: [
          {
            example: '/task list',
            description: 'Toon alle openstaande taken'
          }
        ]
      },
      complete: {
        description: 'Markeer een taak als afgerond',
        usage: [
          {
            example: '/task complete 123',
            description: 'Markeer taak #123 als afgerond'
          }
        ]
      },
      assign: {
        description: 'Wijs een taak toe aan een gebruiker',
        usage: [
          {
            example: '/task assign 123 @Jan',
            description: 'Wijs taak #123 toe aan Jan'
          }
        ]
      }
    }
  }
};

@RegisterCommand(meta)
export class TaskCommand implements Command {
  public meta: CommandMeta = meta;
  private taskService: TaskManagementService;
  private subcommands: Map<string, TaskSubCommand>;

  constructor() {
    const db = DatabaseService.getInstance();
    this.taskService = TaskManagementService.getInstance(
      db.getTaskRepository(),
      eventBus
    );

    // Initialiseer subcommands
    const subcommandEntries: [string, TaskSubCommand][] = [
      ['create', new TaskCreateCommand()],
      ['list', new TaskListCommand()],
      ['assign', new TaskAssignCommand()],
      ['status', new TaskStatusCommand()],
      ['update', new TaskUpdateCommand()],
      ['delete', new TaskDeleteCommand()],
      ['deadline', new TaskDeadlineCommand()]
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

    const subcommandName = interaction.options.getSubcommand();
    const subcommand = this.subcommands.get(subcommandName);

    if (!subcommand) {
      return {
        isValid: false,
        error: `Ongeldig subcommand: ${subcommandName}`
      };
    }

    // Valideer het subcommand als het een validate methode heeft
    if (subcommand.validate) {
      return await subcommand.validate(interaction);
    }

    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const subcommandName = interaction.options.getSubcommand();
      const subcommand = this.subcommands.get(subcommandName);

      if (!subcommand) {
        throw new Error(`Ongeldig subcommand: ${subcommandName}`);
      }

      // Voer het subcommand uit
      await subcommand.execute(interaction);

    } catch (error) {
      await interaction.reply({
        content: `❌ Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true
      });
    }
  }
}

// Import SlashCommandBuilder
import { SlashCommandBuilder } from 'discord.js';

// Export de command builder
export const commandBuilder = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Beheer taken en toewijzingen')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Maak een nieuwe taak aan')
      .addStringOption(option =>
        option.setName('naam').setDescription('Naam van de taak').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('beschrijving').setDescription('Beschrijving van de taak').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('deadline').setDescription('Deadline van de taak (YYYY-MM-DD)').setRequired(false)
      )
      .addUserOption(option =>
        option.setName('assignee').setDescription('Persoon om de taak aan toe te wijzen').setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('Bekijk alle openstaande taken')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('assign')
      .setDescription('Wijs een taak toe aan een gebruiker')
      .addIntegerOption(option =>
        option.setName('id').setDescription('ID van de taak').setRequired(true)
      )
      .addUserOption(option =>
        option.setName('gebruiker').setDescription('Gebruiker om de taak aan toe te wijzen').setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Bekijk of update de status van een taak')
      .addIntegerOption(option =>
        option.setName('id').setDescription('ID van de taak').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('status').setDescription('Nieuwe status van de taak').setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('update')
      .setDescription('Update een bestaande taak')
      .addIntegerOption(option =>
        option.setName('id').setDescription('ID van de taak').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('naam').setDescription('Nieuwe naam van de taak').setRequired(false)
      )
      .addStringOption(option =>
        option.setName('beschrijving').setDescription('Nieuwe beschrijving van de taak').setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('delete')
      .setDescription('Verwijder een taak')
      .addIntegerOption(option =>
        option.setName('id').setDescription('ID van de taak').setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('deadline')
      .setDescription('Update de deadline van een taak')
      .addIntegerOption(option =>
        option.setName('id').setDescription('ID van de taak').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('deadline').setDescription('Nieuwe deadline (YYYY-MM-DD)').setRequired(true)
      )
  );