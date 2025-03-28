import { TaskStatus } from '../../entities/task.entity';
import { validateTask } from '../task.schema';

describe('Task Schema Validatie', () => {
  describe('createTaskSchema', () => {
    it('should validate a valid create task payload', async () => {
      const data = {
        title: 'Test Task',
        description: 'Test Description',
        priority: 3
      };

      const result = await validateTask.create(data);
      
      expect(result).toEqual({
        title: 'Test Task',
        description: 'Test Description',
        priority: 3,
        status: TaskStatus.TODO
      });
    });

    it('should reject invalid create task data', async () => {
      const data = {
        title: '',
        priority: 10
      };

      await expect(validateTask.create(data)).rejects.toThrow('Task validatie errors');
    });
  });

  describe('updateTaskSchema', () => {
    it('should validate a valid partial update', async () => {
      const data = {
        status: TaskStatus.COMPLETED,
        priority: 5
      };

      const result = await validateTask.update(data);
      
      expect(result).toEqual({
        status: TaskStatus.COMPLETED,
        priority: 5
      });
    });

    it('should reject invalid update data', async () => {
      const data = {
        priority: 0,
        status: 'INVALID' as TaskStatus
      };

      await expect(validateTask.update(data)).rejects.toThrow('Task validatie errors');
    });
  });

  describe('complete taskSchema', () => {
    it('should validate a complete task entity', async () => {
      const now = new Date();
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Complete Task',
        status: TaskStatus.IN_PROGRESS,
        priority: 4,
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      const result = await validateTask.complete(data);
      
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Complete Task',
        status: TaskStatus.IN_PROGRESS,
        priority: 4,
        createdAt: now,
        updatedAt: now,
        version: 1
      });
    });

    it('should reject invalid complete task data', async () => {
      const data = {
        id: 'invalid-uuid',
        title: 'Invalid Task',
        status: TaskStatus.TODO,
        version: -1
      };

      await expect(validateTask.complete(data)).rejects.toThrow('Task validatie errors');
    });
  });

  describe('error messages', () => {
    it('should provide descriptive Dutch error messages', async () => {
      const data = {
        title: '',
        priority: 0,
        status: 'INVALID' as TaskStatus
      };

      try {
        await validateTask.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Titel is verplicht');
        expect(message).toContain('Prioriteit moet tussen 1 en 5 zijn');
        expect(message).toContain('Status moet één van de volgende waardes zijn');
      }
    });
  });
});