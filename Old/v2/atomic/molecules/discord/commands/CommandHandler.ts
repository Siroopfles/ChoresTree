import { 
  Client, 
  Collection, 
  Events, 
  Interaction 
} from 'discord.js';
import { BaseCommand, CommandResult, CommandStatus } from '../../../atoms/discord/types/commands';
import { validateCommandInteraction } from '../../../atoms/discord/validators/command.validator';
import { eventBus } from '../../../../core/EventBus';

export class CommandHandler {
  private commands: Collection<string, BaseCommand>;
  private client: Client;

  constructor(client: Client) {
    this.commands = new Collection();
    this.client = client;
    this.setupEventListeners();
  }

  /**
   * Register a new command
   */
  public registerCommand(command: BaseCommand): void {
    const commandName = command.data.name;
    this.commands.set(commandName, command);
  }

  /**
   * Register multiple commands at once
   */
  public registerCommands(commands: BaseCommand[]): void {
    for (const command of commands) {
      this.registerCommand(command);
    }
  }

  /**
   * Get all registered commands
   */
  public getCommands(): Collection<string, BaseCommand> {
    return this.commands;
  }

  /**
   * Setup Discord.js event listeners for command handling
   */
  private setupEventListeners(): void {
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);
      if (!command) return;

      try {
        // Validate command interaction
        const validationResult = validateCommandInteraction(interaction);
        if (!validationResult.isValid) {
          await interaction.reply({
            content: `Error: ${validationResult.errors.join(', ')}`,
            ephemeral: true
          });
          return;
        }

        const startTime = Date.now();

        // Execute command
        if (!command.enabled) {
          throw new Error('This command is currently disabled');
        }

        await command.execute(interaction);

        // Emit command completion event
        const result: CommandResult = {
          status: CommandStatus.SUCCESS,
          context: {
            guildId: interaction.guildId!,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            timestamp: new Date()
          },
          executionTimeMs: Date.now() - startTime
        };

        await eventBus.emit('commandExecuted', result);

      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);

        const errorResult: CommandResult = {
          status: CommandStatus.FAILURE,
          context: {
            guildId: interaction.guildId!,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            timestamp: new Date()
          },
          error: error instanceof Error ? error : new Error(String(error)),
          executionTimeMs: 0
        };

        await eventBus.emit('commandError', errorResult);

        // Handle user response
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Er is een fout opgetreden bij het uitvoeren van dit commando.',
            ephemeral: true
          });
        }
      }
    });
  }

  /**
   * Handle autocomplete interactions
   */
  public async handleAutocomplete(interaction: Interaction): Promise<void> {
    if (!interaction.isAutocomplete()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
    }
  }
}