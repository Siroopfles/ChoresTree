import { IEventHandler } from './IEventHandler';

/**
 * Event metrics interface for monitoring
 */
export interface EventMetrics {
  /**
   * Total number of events published
   */
  totalEvents: number;

  /**
   * Number of events published in the last minute
   */
  eventsPerMinute: number;

  /**
   * Average event processing time in milliseconds
   */
  averageProcessingTime: number;

  /**
   * Number of failed events
   */
  failedEvents: number;

  /**
   * Number of retried events
   */
  retriedEvents: number;
}

/**
 * Core event bus interface for handling events in the system
 * Provides type-safe event publishing and subscription management
 */
export interface IEventBus {
  /**
   * Publish an event to all subscribed handlers
   * @template T The event type
   * @param event The event to publish
   * @throws {EventValidationError} If event validation fails
   * @throws {EventPublishError} If publishing fails after retries
   */
  publish<T>(event: T): Promise<void>;

  /**
   * Subscribe a handler to receive events
   * @template T The event type the handler can process
   * @param handler The event handler to subscribe
   * @throws {HandlerRegistrationError} If handler registration fails
   */
  subscribe<T>(handler: IEventHandler<T>): void;

  /**
   * Unsubscribe a handler from receiving events
   * @template T The event type the handler processes
   * @param handler The event handler to unsubscribe
   */
  unsubscribe<T>(handler: IEventHandler<T>): void;

  /**
   * Get current event metrics for monitoring
   * @returns Current event metrics
   */
  getMetrics(): Promise<EventMetrics>;
}