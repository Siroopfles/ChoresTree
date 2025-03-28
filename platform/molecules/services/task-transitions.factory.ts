import { TaskStatus } from '../../atoms/entities/task.entity';
import { StateTransition } from '../../atoms/interfaces/state-transition.interface';

/**
 * Factory voor het maken van veelgebruikte task transities
 */
export class TaskTransitionsFactory {
  /**
   * Basis transitie validatie functie
   */
  private static defaultValidation = async () => true;

  /**
   * Creëer een transitie van TODO naar IN_PROGRESS
   */
  static createStartTransition(validation?: () => Promise<boolean>): StateTransition<TaskStatus> {
    return {
      from: TaskStatus.TODO,
      to: TaskStatus.IN_PROGRESS,
      validate: validation ?? this.defaultValidation,
    };
  }

  /**
   * Creëer een transitie van IN_PROGRESS naar COMPLETED
   */
  static createCompleteTransition(
    validation?: () => Promise<boolean>,
  ): StateTransition<TaskStatus> {
    return {
      from: TaskStatus.IN_PROGRESS,
      to: TaskStatus.COMPLETED,
      validate: validation ?? this.defaultValidation,
    };
  }

  /**
   * Creëer een transitie naar CANCELLED (vanuit elke status)
   */
  static createCancelTransition(
    fromStatus: TaskStatus,
    validation?: () => Promise<boolean>,
  ): StateTransition<TaskStatus> {
    return {
      from: fromStatus,
      to: TaskStatus.CANCELLED,
      validate: validation ?? this.defaultValidation,
    };
  }

  /**
   * Creëer een set van standaard transities voor tasks
   */
  static createDefaultTransitions(validations?: {
    start?: () => Promise<boolean>;
    complete?: () => Promise<boolean>;
    cancel?: () => Promise<boolean>;
  }): StateTransition<TaskStatus>[] {
    return [
      // Start transition
      this.createStartTransition(validations?.start),

      // Complete transition
      this.createCompleteTransition(validations?.complete),

      // Cancel transitions (from any state except CANCELLED)
      ...Object.values(TaskStatus)
        .filter((status) => status !== TaskStatus.CANCELLED)
        .map((status) => this.createCancelTransition(status, validations?.cancel)),
    ];
  }
}
