import { Client, Events, Interaction } from 'discord.js';
import { eventBus } from '../../../core/eventBus';
import { commandRegistry } from '../../molecules/discord/command-registry';
import { permissionChecker } from './permission-checker';
import { RateLimiter } from './rate-limiter';

interface EventListenerConfig {
  redisUrl: string;
}

export class EventListener {
  private rateLimiter: RateLimiter;

  constructor(
    private client: Client,
    config: EventListenerConfig,
  ) {
    this.rateLimiter = new RateLimiter(config.redisUrl);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle client ready event
    this.client.once(Events.ClientReady, () => {
      eventBus.emit('discord.ready', {
        username: this.client.user?.username,
        id: this.client.user?.id,
      });
    });

    // Handle interaction create event
    this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName, user } = interaction;

      try {
        // Get command
        const command = commandRegistry.getCommand(commandName);
        if (!command) {
          throw new Error(`Command ${commandName} not found`);
        }

        // Check permissions
        await permissionChecker.checkPermissions(interaction, command);

        // Check rate limit
        await this.rateLimiter.checkRateLimit(
          user.id,
          commandName,
          {
            windowMs: command.meta.cooldown ? command.meta.cooldown * 1000 : undefined,
          },
        );

        // Execute command
        await command.execute(interaction);

        // Emit success event
        eventBus.emit('discord.commandExecuted', {
          commandName,
          userId: user.id,
          success: true,
        });
      } catch (error) {
        // Emit error event
        eventBus.emit('discord.commandError', {
          commandName,
          userId: user.id,
          error,
        });

        // Send error message to user
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        if (interaction.deferred) {
          await interaction.editReply({ content: errorMessage });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    });

    // Handle error events
    this.client.on(Events.Error, (error) => {
      eventBus.emit('discord.error', error);
    });
  }

  public async destroy(): Promise<void> {
    await this.rateLimiter.close();
    this.client.removeAllListeners();
    eventBus.emit('discord.destroyed', null);
  }
}

// Factory function
export function createEventListener(
  client: Client,
  config: EventListenerConfig,
): EventListener {
  return new EventListener(client, config);
}