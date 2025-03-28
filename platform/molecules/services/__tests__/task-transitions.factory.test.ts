import { TaskStatus } from '../../../atoms/entities/task.entity';
import { TaskTransitionsFactory } from '../task-transitions.factory';

describe('TaskTransitionsFactory', () => {
  describe('createStartTransition', () => {
    it('should create valid TODO to IN_PROGRESS transition', async () => {
      const transition = TaskTransitionsFactory.createStartTransition();

      expect(transition.from).toBe(TaskStatus.TODO);
      expect(transition.to).toBe(TaskStatus.IN_PROGRESS);
      expect(await transition.validate()).toBe(true);
    });

    it('should use custom validation when provided', async () => {
      const mockValidation = jest.fn().mockResolvedValue(false);
      const transition = TaskTransitionsFactory.createStartTransition(mockValidation);

      const result = await transition.validate();

      expect(mockValidation).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('createCompleteTransition', () => {
    it('should create valid IN_PROGRESS to COMPLETED transition', async () => {
      const transition = TaskTransitionsFactory.createCompleteTransition();

      expect(transition.from).toBe(TaskStatus.IN_PROGRESS);
      expect(transition.to).toBe(TaskStatus.COMPLETED);
      expect(await transition.validate()).toBe(true);
    });

    it('should use custom validation when provided', async () => {
      const mockValidation = jest.fn().mockResolvedValue(false);
      const transition = TaskTransitionsFactory.createCompleteTransition(mockValidation);

      const result = await transition.validate();

      expect(mockValidation).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('createCancelTransition', () => {
    it('should create valid transition to CANCELLED from any status', async () => {
      const statuses = Object.values(TaskStatus).filter((s) => s !== TaskStatus.CANCELLED);

      for (const status of statuses) {
        const transition = TaskTransitionsFactory.createCancelTransition(status);

        expect(transition.from).toBe(status);
        expect(transition.to).toBe(TaskStatus.CANCELLED);
        expect(await transition.validate()).toBe(true);
      }
    });

    it('should use custom validation when provided', async () => {
      const mockValidation = jest.fn().mockResolvedValue(false);
      const transition = TaskTransitionsFactory.createCancelTransition(
        TaskStatus.IN_PROGRESS,
        mockValidation,
      );

      const result = await transition.validate();

      expect(mockValidation).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('createDefaultTransitions', () => {
    it('should create all default transitions', () => {
      const transitions = TaskTransitionsFactory.createDefaultTransitions();

      // Should include start, complete and cancel transitions
      expect(transitions).toHaveLength(
        // 1 start + 1 complete + (all states except CANCELLED can transition to cancelled)
        1 + 1 + (Object.keys(TaskStatus).length - 1),
      );

      // Verify start transition
      expect(transitions).toContainEqual(
        expect.objectContaining({
          from: TaskStatus.TODO,
          to: TaskStatus.IN_PROGRESS,
        }),
      );

      // Verify complete transition
      expect(transitions).toContainEqual(
        expect.objectContaining({
          from: TaskStatus.IN_PROGRESS,
          to: TaskStatus.COMPLETED,
        }),
      );

      // Verify cancel transitions
      for (const status of Object.values(TaskStatus)) {
        if (status !== TaskStatus.CANCELLED) {
          expect(transitions).toContainEqual(
            expect.objectContaining({
              from: status,
              to: TaskStatus.CANCELLED,
            }),
          );
        }
      }
    });

    it('should apply custom validations to all transitions', async () => {
      const mockValidations = {
        start: jest.fn().mockResolvedValue(true),
        complete: jest.fn().mockResolvedValue(true),
        cancel: jest.fn().mockResolvedValue(true),
      };

      const transitions = TaskTransitionsFactory.createDefaultTransitions(mockValidations);

      // Test start transition
      const startTransition = transitions.find(
        (t) => t.from === TaskStatus.TODO && t.to === TaskStatus.IN_PROGRESS,
      );
      await startTransition?.validate();
      expect(mockValidations.start).toHaveBeenCalled();

      // Test complete transition
      const completeTransition = transitions.find(
        (t) => t.from === TaskStatus.IN_PROGRESS && t.to === TaskStatus.COMPLETED,
      );
      await completeTransition?.validate();
      expect(mockValidations.complete).toHaveBeenCalled();

      // Test cancel transition
      const cancelTransition = transitions.find((t) => t.to === TaskStatus.CANCELLED);
      await cancelTransition?.validate();
      expect(mockValidations.cancel).toHaveBeenCalled();
    });
  });
});
