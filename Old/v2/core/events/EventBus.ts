import { IEventBus, EventMetrics } from './interfaces/IEventBus';
import { IEventHandler } from './interfaces/IEventHandler';
import { EventPersistence, EventPersistenceConfig } from './persistence/EventPersistence';
import { EventMetricsCollector } from './monitoring/EventMetricsCollector';
import { EventError, EventPublishError, HandlerRegistrationError } from './errors/EventErrors';

interface EventBusConfig {
  persistence: EventPersistenceConfig;
  maxEventsPerSecond?: number;
}

/**
 * Implementation of the event bus with persistence, rate limiting, and monitoring
 */
export class EventBus implements IEventBus {
  private readonly handlers: Map<string, Set<IEventHandler<unknown>>> = new Map();
  private readonly persistence: EventPersistence;
  private readonly metrics: EventMetricsCollector;
  private readonly maxEventsPerSecond: number;
  private eventCounter: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: EventBusConfig) {
    this.persistence = new EventPersistence(config.persistence);
    this.metrics = new EventMetricsCollector();
    this.maxEventsPerSecond = config.maxEventsPerSecond || 1000;
  }

  /**
   * Initialize the event bus
   */
  public async initialize(): Promise<void> {
    try {
      await this.persistence.initialize();
    } catch (error) {
      throw new EventError(`Failed to initialize event bus: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publish an event to all registered handlers
   */
  public async publish<T>(event: T): Promise<void> {
    const start = Date.now();

    try {
      // Rate limiting check
      if (!this.checkRateLimit()) {
        throw new EventPublishError('Rate limit exceeded');
      }

      // Get event type from event object
      const eventType = this.getEventType(event);
      
      // Persist event
      await this.persistence.publishEvent(eventType, event);

      // Update metrics
      const end = Date.now();
      this.metrics.recordEvent(end - start);

    } catch (error) {
      this.metrics.recordFailure();
      throw new EventPublishError(
        `Failed to publish event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Subscribe a handler to receive events
   */
  public subscribe<T>(handler: IEventHandler<T>): void {
    try {
      const eventType = handler.eventType;
      
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, new Set());
      }
      
      this.handlers.get(eventType)!.add(handler);

      // Setup consumer in persistence layer
      this.persistence.consumeEvents<T>(eventType, async (event: T) => {
        const start = Date.now();
        
        try {
          await handler.handle(event);
          const end = Date.now();
          this.metrics.recordEvent(end - start);
        } catch (error) {
          this.metrics.recordFailure();
          // Retry handling will be managed by the persistence layer
          throw error;
        }
      });

    } catch (error) {
      throw new HandlerRegistrationError(
        `Failed to subscribe handler: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Unsubscribe a handler from receiving events
   */
  public unsubscribe<T>(handler: IEventHandler<T>): void {
    const eventType = handler.eventType;
    const handlers = this.handlers.get(eventType);
    
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Get current event metrics
   */
  public async getMetrics(): Promise<EventMetrics> {
    return this.metrics.getMetrics();
  }

  private getEventType(event: unknown): string {
    if (event && typeof event === 'object' && 'type' in event) {
      return String(event.type);
    }
    return event?.constructor?.name || 'UnknownEvent';
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastResetTime;

    // Reset counter every second
    if (elapsed >= 1000) {
      this.eventCounter = 0;
      this.lastResetTime = now;
    }

    // Check if limit exceeded
    if (this.eventCounter >= this.maxEventsPerSecond) {
      return false;
    }

    this.eventCounter++;
    return true;
  }

  /**
   * Clean shutdown of the event bus
   */
  public async close(): Promise<void> {
    await this.persistence.close();
  }
}