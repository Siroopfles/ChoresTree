import { Client, ClientEvents } from 'discord.js';
import { 
  BaseDiscordEvent, 
  EventStatus 
} from '../../../atoms/discord/types/events';
import { 
  validateEventProcessing, 
  createEventError 
} from '../../../atoms/discord/validators/event.validator';
import { eventBus } from '../../../../core/EventBus';

type EventsMap = Map<keyof ClientEvents, BaseDiscordEvent<keyof ClientEvents>>;

export class EventHandler {
  private client: Client;
  private events: EventsMap;

  constructor(client: Client) {
    this.client = client;
    this.events = new Map();
  }

  /**
   * Register a new event handler with type safety
   */
  public registerEvent<K extends keyof ClientEvents>(
    event: BaseDiscordEvent<K>
  ): void {
    // Type assertion here is safe because we guarantee K matches the event name
    this.events.set(event.name, event as BaseDiscordEvent<keyof ClientEvents>);

    const handler = async (...args: ClientEvents[K]) => {
      let currentValidationResult;
      
      try {
        // Validate event processing
        const validationResult = validateEventProcessing(event.name, args);
        currentValidationResult = validationResult;

        if (validationResult.status !== EventStatus.SUCCESS) {
          if (validationResult.status === EventStatus.IGNORED) {
            return; // Silently ignore events that should not be processed
          }
          throw validationResult.error;
        }

        // Execute event handler with correct types
        await event.execute(...args);

        // Emit success event
        await eventBus.emit('eventHandled', {
          status: EventStatus.SUCCESS,
          metadata: validationResult.metadata
        });

      } catch (error) {
        console.error(`Error handling event ${event.name}:`, error);

        // Create standardized error result with validation metadata if available
        const errorResult = createEventError(
          error instanceof Error ? error : new Error(String(error)),
          currentValidationResult ? currentValidationResult.metadata : { timestamp: new Date() }
        );

        // Emit error event
        await eventBus.emit('eventError', errorResult);
      }
    };

    // Register with Discord.js client
    if (event.once) {
      this.client.once(event.name, handler);
    } else {
      this.client.on(event.name, handler);
    }
  }

  /**
   * Register multiple events at once
   */
  public registerEvents<K extends keyof ClientEvents>(
    events: Array<BaseDiscordEvent<K>>
  ): void {
    for (const event of events) {
      this.registerEvent(event);
    }
  }

  /**
   * Unregister an event handler
   */
  public unregisterEvent(eventName: keyof ClientEvents): void {
    const event = this.events.get(eventName);
    if (event) {
      this.client.removeAllListeners(eventName);
      this.events.delete(eventName);
    }
  }

  /**
   * Get all registered events
   */
  public getEvents(): ReadonlyMap<keyof ClientEvents, BaseDiscordEvent<keyof ClientEvents>> {
    return this.events;
  }

  /**
   * Clean up all event listeners
   */
  public cleanup(): void {
    for (const [eventName] of this.events) {
      this.unregisterEvent(eventName);
    }
    this.events.clear();
  }
}