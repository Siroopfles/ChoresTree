import { EventEmitter } from 'events';
import { TaskStatus } from '../../atoms/entities/task.entity';
import {
  IStateMachine,
  StateTransition,
  StateMachineConfig,
  StateTransitionEvent,
  TransitionValidationError,
} from '../../atoms/interfaces/state-transition.interface';

/**
 * Implementatie van de state machine voor TaskStatus
 */
export class TaskStateMachine implements IStateMachine<TaskStatus> {
  private currentState: TaskStatus;
  public readonly eventEmitter: EventEmitter;
  private readonly transitions: StateTransition<TaskStatus>[];
  private readonly onTransitionSuccess?: (event: StateTransitionEvent<TaskStatus>) => Promise<void>;
  private readonly onTransitionError?: (
    error: Error,
    from: TaskStatus,
    to: TaskStatus,
  ) => Promise<void>;

  constructor(config: StateMachineConfig<TaskStatus>) {
    this.currentState = config.initialState;
    this.transitions = config.transitions;
    this.onTransitionSuccess = config.onTransitionSuccess;
    this.onTransitionError = config.onTransitionError;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Huidige status ophalen
   */
  getCurrentState(): TaskStatus {
    return this.currentState;
  }

  /**
   * Controleren of een transitie mogelijk is
   */
  async canTransition(to: TaskStatus): Promise<boolean> {
    const transition = this.findTransition(to);
    if (!transition) {
      return false;
    }

    try {
      return await transition.validate();
    } catch {
      return false;
    }
  }

  /**
   * Status transitie uitvoeren
   */
  async transition(to: TaskStatus, metadata?: Record<string, unknown>): Promise<void> {
    const transition = this.findTransition(to);

    if (!transition) {
      throw new TransitionValidationError(
        this.currentState,
        to,
        `Invalid transition from ${this.currentState} to ${to}`,
      );
    }

    try {
      // Valideer de transitie
      const isValid = await transition.validate();
      if (!isValid) {
        throw new TransitionValidationError(
          this.currentState,
          to,
          `Transition validation failed from ${this.currentState} to ${to}`,
        );
      }

      // Pre-transitie hook
      if (transition.preTransition) {
        await transition.preTransition();
      }

      // Update state
      const from = this.currentState;
      this.currentState = to;

      // Post-transitie hook
      if (transition.postTransition) {
        await transition.postTransition();
      }

      // Event data
      const event: StateTransitionEvent<TaskStatus> = {
        from,
        to,
        timestamp: new Date(),
        metadata,
      };

      // Emit events
      this.eventEmitter.emit('transitionSuccess', event);
      if (this.onTransitionSuccess) {
        await this.onTransitionSuccess(event);
      }
    } catch (error) {
      // Error handling
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.eventEmitter.emit('transitionError', typedError, this.currentState, to);

      if (this.onTransitionError) {
        await this.onTransitionError(typedError, this.currentState, to);
      }

      throw typedError;
    }
  }

  /**
   * Event listener registreren
   */
  on(event: 'transitionSuccess', listener: (event: StateTransitionEvent<TaskStatus>) => void): void;
  on(
    event: 'transitionError',
    listener: (error: Error, from: TaskStatus, to: TaskStatus) => void,
  ): void;
  on(
    event: 'transitionSuccess' | 'transitionError',
    listener:
      | ((event: StateTransitionEvent<TaskStatus>) => void)
      | ((error: Error, from: TaskStatus, to: TaskStatus) => void),
  ): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Helper om een transitie te vinden
   */
  private findTransition(to: TaskStatus): StateTransition<TaskStatus> | undefined {
    return this.transitions.find((t) => t.from === this.currentState && t.to === to);
  }
}

/**
 * Factory functie voor het maken van een TaskStateMachine met default configuratie
 */
export function createTaskStateMachine(
  initialState: TaskStatus = TaskStatus.TODO,
  transitions: StateTransition<TaskStatus>[] = [],
): TaskStateMachine {
  return new TaskStateMachine({
    initialState,
    transitions,
  });
}
