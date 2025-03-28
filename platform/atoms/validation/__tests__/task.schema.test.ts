import { TaskStatus } from '../../entities/task.entity';
import { validateTask } from '../task.schema';

describe('Task Schema Validatie', () => {
  describe('createTaskSchema', () => {
    it('should validate a valid create task payload', async () => {
      const data = {
        title: 'Test Task',
        description: 'Test Description',
        priority: 3,
      };

      const result = await validateTask.create(data);

      expect(result).toEqual({
        title: 'Test Task',
        description: 'Test Description',
        priority: 3,
        status: TaskStatus.TODO,
      });
    });

    it('should reject invalid create task data', async () => {
      const data = {
        title: '',
        priority: 10,
      };

      await expect(validateTask.create(data)).rejects.toThrow('Task validatie errors');
    });
  });
  describe('updateTaskSchema', () => {
    it('should validate a valid partial update', async () => {
      const data = {
        status: TaskStatus.COMPLETED,
        priority: 5,
      };

      const result = await validateTask.update(data);

      expect(result).toEqual({
        status: TaskStatus.COMPLETED,
        priority: 5,
      });
    });

    it('should reject invalid update data', async () => {
      const data = {
        priority: 0,
        status: 'INVALID' as TaskStatus,
      };

      await expect(validateTask.update(data)).rejects.toThrow('Task validatie errors');
    });
  });

  describe('dueDate validation', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    it('should accept a valid future date', async () => {
      const data = {
        title: 'Test Task',
        dueDate: tomorrow,
      };

      const result = await validateTask.create(data);
      expect(result.dueDate).toEqual(tomorrow);
    });

    it('should reject a past date', async () => {
      const data = {
        title: 'Test Task',
        dueDate: yesterday,
      };

      await expect(validateTask.create(data)).rejects.toThrow(
        'Deadline moet in de toekomst liggen',
      );
    });

    it('should handle timezone correctly', async () => {
      const futureDate = new Date(Date.UTC(2025, 11, 31, 23, 59));
      const data = {
        title: 'Test Task',
        dueDate: futureDate,
      };

      const result = await validateTask.create(data);
      expect(result.dueDate).toEqual(futureDate);
    });

    it('should reject invalid date formats', async () => {
      const data = {
        title: 'Test Task',
        dueDate: 'not-a-date',
      };

      await expect(validateTask.create(data)).rejects.toThrow(
        'Deadline moet een geldige datum zijn',
      );
    });

    it('should handle undefined dueDate', async () => {
      const data = {
        title: 'Test Task',
        dueDate: undefined,
      };

      const result = await validateTask.create(data);
      expect(result.dueDate).toBeUndefined();
    });
  });

  describe('description field validation', () => {
    it('should accept valid description', async () => {
      const data = {
        title: 'Test Task',
        description: 'This is a valid description',
      };

      const result = await validateTask.create(data);
      expect(result.description).toBe('This is a valid description');
    });

    it('should trim whitespace from description', async () => {
      const data = {
        title: 'Test Task',
        description: '  whitespace  ',
      };

      const result = await validateTask.create(data);
      expect(result.description).toBe('whitespace');
    });

    it('should enforce maximum length', async () => {
      const data = {
        title: 'Test Task',
        description: 'a'.repeat(1001),
      };

      await expect(validateTask.create(data)).rejects.toThrow(
        'Beschrijving mag maximaal 1000 karakters zijn',
      );
    });

    it('should handle special characters', async () => {
      const data = {
        title: 'Test Task',
        description: 'Special chars: éüñ@#$%^&*()',
      };

      const result = await validateTask.create(data);
      expect(result.description).toBe('Special chars: éüñ@#$%^&*()');
    });

    it('should accept undefined description', async () => {
      const data = {
        title: 'Test Task',
        description: undefined,
      };

      const result = await validateTask.create(data);
      expect(result.description).toBeUndefined();
    });
  });

  describe('assigneeId validation', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    it('should accept valid UUID', async () => {
      const data = {
        title: 'Test Task',
        assigneeId: validUUID,
      };

      const result = await validateTask.create(data);
      expect(result.assigneeId).toBe(validUUID);
    });

    it('should reject invalid UUID format', async () => {
      const data = {
        title: 'Test Task',
        assigneeId: 'not-a-uuid',
      };

      await expect(validateTask.create(data)).rejects.toThrow('Ongeldig gebruikers ID');
    });

    it('should accept undefined assigneeId', async () => {
      const data = {
        title: 'Test Task',
        assigneeId: undefined,
      };

      const result = await validateTask.create(data);
      expect(result.assigneeId).toBeUndefined();
    });

    it('should reject non-string UUID', async () => {
      const data = {
        title: 'Test Task',
        assigneeId: 123 as unknown as string,
      };

      await expect(validateTask.create(data)).rejects.toThrow('Ongeldig gebruikers ID');
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
        version: 1,
      };

      const result = await validateTask.complete(data);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Complete Task',
        status: TaskStatus.IN_PROGRESS,
        priority: 4,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    });

    it('should reject invalid complete task data', async () => {
      const data = {
        id: 'invalid-uuid',
        title: 'Invalid Task',
        status: TaskStatus.TODO,
        version: -1,
      };

      await expect(validateTask.complete(data)).rejects.toThrow('Task validatie errors');
    });
  });

  describe('error messages', () => {
    it('should provide descriptive Dutch error messages', async () => {
      const data = {
        title: '',
        priority: 0,
        status: 'INVALID' as TaskStatus,
        dueDate: 'invalid-date',
        assigneeId: 'invalid-uuid',
        description: 'a'.repeat(1001),
      };

      try {
        await validateTask.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Titel is verplicht');
        expect(message).toContain('Prioriteit moet tussen 1 en 5 zijn');
        expect(message).toContain('Status moet één van de volgende waardes zijn');
        expect(message).toContain('Deadline moet een geldige datum zijn');
        expect(message).toContain('Ongeldig gebruikers ID');
        expect(message).toContain('Beschrijving mag maximaal 1000 karakters zijn');
      }
    });

    it('should combine multiple field errors', async () => {
      const data = {
        title: '',
        description: 'a'.repeat(1001),
        dueDate: 'invalid',
      };

      try {
        await validateTask.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        const errors = JSON.parse((error as Error).message.split('Task validatie errors: ')[1]);
        expect(errors).toHaveLength(3);
        expect(errors).toContainEqual({
          field: 'title',
          message: 'Titel is verplicht',
        });
        expect(errors).toContainEqual({
          field: 'description',
          message: 'Beschrijving mag maximaal 1000 karakters zijn',
        });
        expect(errors).toContainEqual({
          field: 'dueDate',
          message: 'Deadline moet een geldige datum zijn',
        });
      }
    });

    it('should format field-specific errors correctly', async () => {
      const data = {
        title: 'Test Task',
        dueDate: new Date('2020-01-01'),
      };

      try {
        await validateTask.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        const errors = JSON.parse((error as Error).message.split('Task validatie errors: ')[1]);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toEqual({
          field: 'dueDate',
          message: 'Deadline moet in de toekomst liggen',
        });
      }
    });
  });
});
