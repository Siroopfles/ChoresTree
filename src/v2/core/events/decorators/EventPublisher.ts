import { EventError } from '../errors/EventErrors';
import { EventBus } from '../EventBus';

let globalEventBus: EventBus | null = null;

/**
 * Set the global event bus instance
 * @param eventBus EventBus instance to use globally
 */
export function setEventBus(eventBus: EventBus): void {
  globalEventBus = eventBus;
}

/**
 * Interface for event publisher configuration
 */
interface EventPublisherOptions {
  eventType: string;
  eventFactory?: (result: unknown, ...args: unknown[]) => unknown;
}

/**
 * Generic event publisher decorator factory
 * @param options Event publisher configuration
 */
export function PublishEvent(options: EventPublisherOptions): MethodDecorator {
  return function(
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') {
      throw new EventError('PublishEvent decorator can only be applied to methods');
    }

    descriptor.value = async function(...args: unknown[]): Promise<unknown> {
      if (!globalEventBus) {
        throw new EventError('EventBus not initialized. Call setEventBus before using @PublishEvent');
      }

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Create and publish event
        const event = options.eventFactory 
          ? options.eventFactory(result, ...args)
          : {
              type: options.eventType,
              result,
              timestamp: new Date().toISOString()
            };

        await globalEventBus.publish(event);
        return result;
      } catch (error) {
        throw new EventError(
          `Error in event publisher ${String(propertyKey)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    return descriptor;
  };
}

/**
 * Simplified event publisher decorator
 * @param eventType The type of event to publish
 */
export function AutoPublish(eventType: string): MethodDecorator {
  return PublishEvent({ eventType });
}