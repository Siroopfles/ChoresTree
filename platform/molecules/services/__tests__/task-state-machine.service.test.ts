import { TaskStatus } from '../../../atoms/entities/task.entity';
import { StateTransition, TransitionValidationError } from '../../../atoms/interfaces/state-transition.interface';
import { TaskStateMachine, createTaskStateMachine } from '../task-state-machine.service';

describe('TaskStateMachine', () => {
  let stateMachine: TaskStateMachine;
  let mockTransition: StateTransition<TaskStatus>;

  beforeEach(() => {
    mockTransition = {
      from: TaskStatus.TODO,
      to: TaskStatus.IN_PROGRESS,
      validate: jest.fn().mockResolvedValue(true)
    };

    stateMachine = createTaskStateMachine(TaskStatus.TODO, [mockTransition]);
  });

  describe('getCurrentState', () => {
    it('should return initial state', () => {
      expect(stateMachine.getCurrentState()).toBe(TaskStatus.TODO);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transition', async () => {
      const canTransition = await stateMachine.canTransition(TaskStatus.IN_PROGRESS);
      expect(canTransition).toBe(true);
      expect(mockTransition.validate).toHaveBeenCalled();
    });

    it('should return false for invalid transition', async () => {
      const canTransition = await stateMachine.canTransition(TaskStatus.COMPLETED);
      expect(canTransition).toBe(false);
    });

    it('should return false when validation fails', async () => {
      (mockTransition.validate as jest.Mock).mockResolvedValueOnce(false);
      const canTransition = await stateMachine.canTransition(TaskStatus.IN_PROGRESS);
      expect(canTransition).toBe(false);
    });
  });

  describe('transition', () => {
    it('should execute valid transition', async () => {
      const metadata = { reason: 'test' };
      const onTransitionSuccess = jest.fn();
      stateMachine.on('transitionSuccess', onTransitionSuccess);

      await stateMachine.transition(TaskStatus.IN_PROGRESS, metadata);

      expect(stateMachine.getCurrentState()).toBe(TaskStatus.IN_PROGRESS);
      expect(onTransitionSuccess).toHaveBeenCalledWith(expect.objectContaining({
        from: TaskStatus.TODO,
        to: TaskStatus.IN_PROGRESS,
        metadata
      }));
    });

    it('should execute pre/post transition hooks', async () => {
      const preTransition = jest.fn();
      const postTransition = jest.fn();
      mockTransition.preTransition = preTransition;
      mockTransition.postTransition = postTransition;

      await stateMachine.transition(TaskStatus.IN_PROGRESS);

      expect(preTransition).toHaveBeenCalled();
      expect(postTransition).toHaveBeenCalled();
    });

    it('should throw error for invalid transition', async () => {
      await expect(stateMachine.transition(TaskStatus.COMPLETED))
        .rejects
        .toThrow(TransitionValidationError);
    });

    it('should emit error event when validation fails', async () => {
      const onTransitionError = jest.fn();
      stateMachine.on('transitionError', onTransitionError);
      (mockTransition.validate as jest.Mock).mockResolvedValueOnce(false);

      await expect(stateMachine.transition(TaskStatus.IN_PROGRESS))
        .rejects
        .toThrow(TransitionValidationError);

      expect(onTransitionError).toHaveBeenCalledWith(
        expect.any(TransitionValidationError),
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS
      );
    });
  });
});