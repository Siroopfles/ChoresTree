import { EventError } from '../errors/EventErrors';

/**
 * Type definition for event handler methods
 */
type EventHandlerMethod = (event: unknown) => Promise<void>;

/**
 * Interface for event handler targets
 */
interface EventHandlerTarget {
  eventType?: string;
  handle?: EventHandlerMethod;
  [key: string]: unknown;
}

/**
 * Decorator factory for event handler classes
 * @param eventType The type of event to handle
 */
export function EventHandler(eventType: string): ClassDecorator {
  return function(target: Function): void {
    // Set eventType property
    Reflect.defineProperty(target.prototype, 'eventType', {
      value: eventType,
      writable: false,
      enumerable: true,
    });

    // Verify handle method exists
    const original = target.prototype.handle;
    if (!original || typeof original !== 'function') {
      throw new EventError('Class decorated with @EventHandler must implement handle method');
    }

    // Wrap original handle method
    target.prototype.handle = async function(event: unknown): Promise<void> {
      try {
        await original.call(this, event);
      } catch (error) {
        throw new EventError(
          `Error handling event ${eventType}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
  };
}

/**
 * Method decorator for event handling methods
 * @param eventType The type of event to handle
 */
export function HandleEvent(eventType: string) {
  return function (
    target: EventHandlerTarget,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<EventHandlerMethod>
  ): TypedPropertyDescriptor<EventHandlerMethod> {
    const originalMethod = descriptor.value;
    if (!originalMethod) {
      throw new EventError('Method decorated with @HandleEvent must be defined');
    }

    // Set event type on the instance
    Reflect.defineProperty(target, 'eventType', {
      value: eventType,
      writable: false,
      enumerable: true,
    });

    // Wrap the original method
    descriptor.value = async function(this: unknown, event: unknown): Promise<void> {
      try {
        await originalMethod.call(this, event);
      } catch (error) {
        throw new EventError(
          `Error handling event ${eventType}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    return descriptor;
  };
}