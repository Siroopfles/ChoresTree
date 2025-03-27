/**
 * Generic interface for event handlers
 * @template T The type of event this handler can process
 */
export interface IEventHandler<T> {
  /**
   * The event type this handler can process
   */
  eventType: string;

  /**
   * Handle the event
   * @param event The event to handle
   */
  handle(event: T): Promise<void>;
}