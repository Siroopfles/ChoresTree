import { Client, ClientEvents, GatewayIntentBits } from 'discord.js';
import { EventHandler } from './handlers/EventHandler';
import { CommandHandler } from '../../molecules/discord/commands/CommandHandler';
import { BaseDiscordEvent } from '../../atoms/discord/types/events';
import { BaseCommand } from '../../atoms/discord/types/commands';
import { eventBus } from '../../../core/EventBus';

export class Bot {
  private client: Client;
  private eventHandler: EventHandler;
  private commandHandler: CommandHandler;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
      ]
    });

    this.eventHandler = new EventHandler(this.client);
    this.commandHandler = new CommandHandler(this.client);

    // Setup core event handlers
    this.setupCoreEvents();
  }

  /**
   * Start the Discord bot
   */
  public async start(): Promise<void> {
    try {
      await this.client.login(this.token);
      
      await eventBus.emit('botStarted', {
        timestamp: new Date(),
        clientId: this.client.user?.id
      });
    } catch (error) {
      console.error('Failed to start bot:', error);
      throw error;
    }
  }

  /**
   * Register a Discord event handler
   */
  public registerEvent<K extends keyof ClientEvents>(
    event: BaseDiscordEvent<K>
  ): void {
    this.eventHandler.registerEvent(event);
  }

  /**
   * Register multiple Discord event handlers
   */
  public registerEvents<K extends keyof ClientEvents>(
    events: Array<BaseDiscordEvent<K>>
  ): void {
    this.eventHandler.registerEvents(events);
  }

  /**
   * Register a Discord command
   */
  public registerCommand(command: BaseCommand): void {
    this.commandHandler.registerCommand(command);
  }

  /**
   * Register multiple Discord commands
   */
  public registerCommands(commands: BaseCommand[]): void {
    this.commandHandler.registerCommands(commands);
  }

  /**
   * Setup core event handlers
   */
  private setupCoreEvents(): void {
    // Error handling
    this.client.on('error', async (error) => {
      console.error('Discord client error:', error);
      await eventBus.emit('botError', {
        timestamp: new Date(),
        error,
        clientId: this.client.user?.id
      });
    });

    // Ready event
    this.client.once('ready', async () => {
      const readyEvent = {
        timestamp: new Date(),
        clientId: this.client.user?.id,
        guildCount: this.client.guilds.cache.size
      };
      
      await eventBus.emit('botReady', readyEvent);
    });

    // Interaction handling
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isAutocomplete()) {
        await this.commandHandler.handleAutocomplete(interaction);
      }
    });
  }

  /**
   * Gracefully shutdown the bot
   */
  public async shutdown(): Promise<void> {
    try {
      // Cleanup handlers
      this.eventHandler.cleanup();
      
      // Destroy client
      this.client.destroy();
      
      await eventBus.emit('botShutdown', {
        timestamp: new Date(),
        clientId: this.client.user?.id
      });
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }
}