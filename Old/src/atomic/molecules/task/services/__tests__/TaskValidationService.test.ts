import { TaskValidationService, TaskValidationError } from '../TaskValidationService';
import { TaskStatus, TaskPriority } from '@/atomic/atoms/database/interfaces/Task';

describe('TaskValidationService', () => {
  let service: TaskValidationService;

  beforeEach(() => {
    service = new TaskValidationService();
  });

  describe('validateTask', () => {
    const validTask = {
      title: 'Test Task',
      description: 'Test Description',
      assigneeId: 'user123',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
    };

    it('should validate a valid task without throwing', () => {
      expect(() => service.validateTask(validTask)).not.toThrow();
    });

    it('should throw on empty title', () => {
      const invalidTask = { ...validTask, title: '' };
      expect(() => service.validateTask(invalidTask)).toThrow(TaskValidationError);
      expect(() => service.validateTask(invalidTask)).toThrow('Title is required');
    });

    it('should throw on title too long', () => {
      const longTitle = 'a'.repeat(101);
      const invalidTask = { ...validTask, title: longTitle };
      expect(() => service.validateTask(invalidTask)).toThrow(TaskValidationError);
      expect(() => service.validateTask(invalidTask)).toThrow('Title must be less than');
    });

    it('should throw on description too long', () => {
      const longDescription = 'a'.repeat(1001);
      const invalidTask = { ...validTask, description: longDescription };
      expect(() => service.validateTask(invalidTask)).toThrow(TaskValidationError);
      expect(() => service.validateTask(invalidTask)).toThrow('Description must be less than');
    });

    it('should throw on past deadline', () => {
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 1); // Gisteren
      const invalidTask = { ...validTask, deadline: pastDeadline };
      expect(() => service.validateTask(invalidTask)).toThrow(TaskValidationError);
      expect(() => service.validateTask(invalidTask)).toThrow('Deadline cannot be in the past');
    });

    it('should validate future deadline', () => {
      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 1); // Morgen
      const validTaskWithDeadline = { ...validTask, deadline: futureDeadline };
      expect(() => service.validateTask(validTaskWithDeadline)).not.toThrow();
    });

    it('should throw on invalid status', () => {
      const invalidTask = { ...validTask, status: 'INVALID_STATUS' as TaskStatus };
      expect(() => service.validateTask(invalidTask)).toThrow(TaskValidationError);
      expect(() => service.validateTask(invalidTask)).toThrow('Invalid task status');
    });

    it('should throw on missing assignee', () => {
      const invalidTask = { ...validTask, assigneeId: '' };
      expect(() => service.validateTask(invalidTask)).toThrow(TaskValidationError);
      expect(() => service.validateTask(invalidTask)).toThrow('Assignee ID is required');
    });
  });

  describe('validateTasks (bulk validation)', () => {
    const validTask = {
      title: 'Test Task',
      description: 'Test Description',
      assigneeId: 'user123',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
    };

    it('should return empty array for valid tasks', async () => {
      const tasks = [validTask, { ...validTask, title: 'Another Task' }];
      const errors = await service.validateTasks(tasks);
      expect(errors).toHaveLength(0);
    });

    it('should return validation errors for invalid tasks', async () => {
      const tasks = [
        validTask,
        { ...validTask, title: '' },
        { ...validTask, assigneeId: '' },
      ];

      const errors = await service.validateTasks(tasks);
      expect(errors).toHaveLength(2);
      expect(errors[1]).toBeInstanceOf(TaskValidationError);
      expect(errors[2]).toBeInstanceOf(TaskValidationError);
    });

    it('should process tasks in parallel', async () => {
      const tasks = Array(100).fill(validTask);
      const startTime = Date.now();
      await service.validateTasks(tasks);
      const duration = Date.now() - startTime;
      
      // Parallel verwerking zou significant sneller moeten zijn dan sequentieel
      expect(duration).toBeLessThan(100); // Minder dan 1ms per taak
    });
  });
});