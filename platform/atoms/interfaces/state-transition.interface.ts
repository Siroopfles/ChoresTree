import { EventEmitter } from 'events';

/**
 * Event data voor een state transitie
 */
export interface StateTransitionEvent<T> {
  from: T;
  to: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Interface voor een enkele state transitie
 */
export interface StateTransition<T> {
  from: T;
  to: T;
  validate: () => Promise<boolean>;
  preTransition?: () => Promise<void>;
  postTransition?: () => Promise<void>;
}

/**
 * Configuratie voor het state machine systeem
 */
export interface StateMachineConfig<T> {
  initialState: T;
  transitions: StateTransition<T>[];
  onTransitionSuccess?: (event: StateTransitionEvent<T>) => Promise<void>;
  onTransitionError?: (error: Error, from: T, to: T) => Promise<void>;
}

/**
 * Type voor transitie validatie errors
 */
export class TransitionValidationError extends Error {
  constructor(
    public readonly from: unknown,
    public readonly to: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'TransitionValidationError';
  }
}

/**
 * Interface voor de state machine
 */
export interface IStateMachine<T> {
  // Huidige state ophalen
  getCurrentState(): T;

  // State transitie uitvoeren
  transition(to: T, metadata?: Record<string, unknown>): Promise<void>;

  // Controleren of een transitie mogelijk is
  canTransition(to: T): Promise<boolean>;

  // Events
  on(event: 'transitionSuccess', listener: (event: StateTransitionEvent<T>) => void): void;
  on(event: 'transitionError', listener: (error: Error, from: T, to: T) => void): void;

  // Event emitter voor type-safe event handling
  eventEmitter: EventEmitter;
}
