// Core event system
export { EventBus } from './EventBus';
export { EventPersistence, type EventPersistenceConfig } from './persistence/EventPersistence';
export { type EventMetrics } from './interfaces/IEventBus';
export { type IEventBus } from './interfaces/IEventBus';
export { type IEventHandler } from './interfaces/IEventHandler';

// Event system errors
export {
  EventError,
  EventValidationError,
  EventPublishError,
  HandlerRegistrationError,
  RateLimitExceededError
} from './errors/EventErrors';

// Event decorators
export {
  EventHandler,
  HandleEvent
} from './decorators/EventHandler';

export {
  PublishEvent,
  AutoPublish,
  setEventBus
} from './decorators/EventPublisher';

// Event monitoring
export { EventMetricsCollector } from './monitoring/EventMetricsCollector';