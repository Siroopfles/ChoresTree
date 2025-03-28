import { z } from 'zod';
import { NotificationStatus, NotificationType } from '../../entities/notification.entity';
import {
  notificationSchema,
  validateNotification,
  createNotificationSchema,
  updateNotificationSchema,
  ValidatedNotification,
} from '../notification.schema';

describe('Notification Schema Validation', () => {
  const validNotification: Partial<ValidatedNotification> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    version: 1,
    type: NotificationType.TASK_ASSIGNED,
    status: NotificationStatus.UNREAD,
    priority: 3,
    content: 'Test notification',
    recipientId: 'user123',
    taskId: '123e4567-e89b-12d3-a456-426614174001',
    metadata: { key: 'value' },
  };

  describe('Create Validation', () => {
    const validCreateData = {
      type: NotificationType.TASK_ASSIGNED,
      content: 'Test notification',
      recipientId: 'user123',
    };

    test('should validate valid create data', async () => {
      await expect(validateNotification.create(validCreateData)).resolves.toBeDefined();
    });

    test('should handle validation errors in create', async () => {
      const invalidData = {
        type: 'INVALID' as NotificationType,
        content: '',
        recipientId: '',
      };

      try {
        await validateNotification.create(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Create notification validatie errors');
          expect(error.message).toContain('Type moet één van de volgende waardes zijn');
          expect(error.message).toContain('Content mag niet leeg zijn');
          expect(error.message).toContain('Ontvanger ID mag niet leeg zijn');
        }
      }
    });

    test('should use default values in create', async () => {
      const result = await validateNotification.create(validCreateData);
      expect(result.status).toBe(NotificationStatus.UNREAD);
      expect(result.priority).toBe(3);
    });

    test('should handle invalid type error', async () => {
      const invalidData = {
        ...validCreateData,
        type: undefined,
      };

      try {
        await validateNotification.create(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Type is verplicht');
        }
      }
    });

    test('should handle unknown type validation error', async () => {
      const mockSchema = createNotificationSchema.extend({
        type: z.custom((_val) => {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['type'],
              message: 'Type moet een geldige waarde zijn',
            },
          ]);
        }),
      });

      const original = createNotificationSchema.parseAsync;
      createNotificationSchema.parseAsync =
        mockSchema.parseAsync as typeof createNotificationSchema.parseAsync;

      try {
        await validateNotification.create(validCreateData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Type moet een geldige waarde zijn');
        }
      } finally {
        createNotificationSchema.parseAsync = original;
      }
    });
  });

  describe('Update Validation', () => {
    test('should validate valid update data', async () => {
      const validUpdateData = {
        content: 'Updated content',
        status: NotificationStatus.READ,
      };

      await expect(validateNotification.update(validUpdateData)).resolves.toBeDefined();
    });

    test('should handle validation errors in update', async () => {
      const invalidData = {
        status: 'INVALID' as NotificationStatus,
        priority: 10,
        content: 'a'.repeat(2001),
      };

      try {
        await validateNotification.update(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Update notification validatie errors');
          expect(error.message).toContain('Status moet één van de volgende waardes zijn');
          expect(error.message).toContain('Prioriteit moet tussen 1 en 5 zijn');
          expect(error.message).toContain('Content mag maximaal 2000 karakters zijn');
        }
      }
    });

    test('should allow partial updates', async () => {
      const updates = [
        { content: 'New content' },
        { status: NotificationStatus.READ },
        { priority: 5 },
        { metadata: { newKey: 'newValue' } },
      ];

      for (const update of updates) {
        await expect(validateNotification.update(update)).resolves.toBeDefined();
      }
    });
  });

  describe('Type Validation', () => {
    test('should validate notification type enum', async () => {
      const invalidData = {
        ...validNotification,
        type: 'INVALID_TYPE',
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Type moet één van de volgende waardes zijn');
          expect(error.message).toContain('TASK_ASSIGNED');
        }
      }
    });

    test('should handle non-string type values', async () => {
      const invalidData = {
        ...validNotification,
        type: 123,
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Type moet één van de volgende waardes zijn');
        }
      }
    });
  });

  describe('Status Validation', () => {
    test('should validate notification status enum', async () => {
      const invalidData = {
        ...validNotification,
        status: 'INVALID_STATUS',
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Status moet één van de volgende waardes zijn');
          expect(error.message).toContain('UNREAD');
          expect(error.message).toContain('READ');
        }
      }
    });

    test('should handle missing status', async () => {
      const invalidData = { ...validNotification } as Partial<ValidatedNotification>;
      delete invalidData.status;

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Status is verplicht');
        }
      }
    });

    test('should handle non-string status values', async () => {
      const invalidData = {
        ...validNotification,
        status: 123,
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Status moet één van de volgende waardes zijn');
        }
      }
    });

    test('should handle unknown status validation error', async () => {
      const mockSchema = notificationSchema.extend({
        status: z.custom((_val) => {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['status'],
              message: 'Status moet een geldige waarde zijn',
            },
          ]);
        }),
      });

      const original = notificationSchema.parseAsync;
      notificationSchema.parseAsync = mockSchema.parseAsync as typeof notificationSchema.parseAsync;

      try {
        await validateNotification.complete(validNotification);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Status moet een geldige waarde zijn');
        }
      } finally {
        notificationSchema.parseAsync = original;
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle non-Zod errors in complete validation', async () => {
      const original = notificationSchema.parseAsync;
      notificationSchema.parseAsync = async () => {
        throw new Error('Systeem error in complete');
      };

      try {
        await validateNotification.complete(validNotification);
        fail('Should have thrown error');
      } catch (err) {
        const error = err as Error;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Systeem error in complete');
      } finally {
        notificationSchema.parseAsync = original;
      }
    });

    test('should handle non-Zod errors in create validation', async () => {
      const original = createNotificationSchema.parseAsync;
      createNotificationSchema.parseAsync = async () => {
        throw new Error('Systeem error in create');
      };

      try {
        await validateNotification.create(validNotification);
        fail('Should have thrown error');
      } catch (err) {
        const error = err as Error;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Systeem error in create');
      } finally {
        createNotificationSchema.parseAsync = original;
      }
    });

    test('should handle non-Zod errors in update validation', async () => {
      const original = updateNotificationSchema.parseAsync;
      updateNotificationSchema.parseAsync = async () => {
        throw new Error('Systeem error in update');
      };

      try {
        await validateNotification.update(validNotification);
        fail('Should have thrown error');
      } catch (err) {
        const error = err as Error;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Systeem error in update');
      } finally {
        updateNotificationSchema.parseAsync = original;
      }
    });
  });

  describe('Field Validation', () => {
    test('should validate priority range', async () => {
      const invalidData = {
        ...validNotification,
        priority: 6,
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Prioriteit moet tussen 1 en 5 zijn');
        }
      }
    });

    test('should validate content length', async () => {
      const invalidData = {
        ...validNotification,
        content: 'a'.repeat(2001),
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Content mag maximaal 2000 karakters zijn');
        }
      }
    });

    test('should validate taskId format', async () => {
      const invalidData = {
        ...validNotification,
        taskId: 'invalid-uuid',
      };

      try {
        await validateNotification.complete(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Taak ID moet een geldig UUID zijn');
        }
      }
    });
  });
});
