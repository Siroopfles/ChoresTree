type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, data: T): Promise<void>;
}

class EventBusImpl implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  public on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler as EventHandler);
  }

  public off<T>(event: string, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  public async emit<T>(event: string, data: T): Promise<void> {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      const promises = Array.from(eventHandlers).map((handler) =>
        Promise.resolve().then(() => handler(data)),
      );
      await Promise.all(promises);
    }
  }
}

export const eventBus = new EventBusImpl();
export type { EventBus, EventHandler };
