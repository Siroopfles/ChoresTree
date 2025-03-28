import { NotificationStatus, NotificationType } from '../../entities/notification.entity';
import { validateNotification } from '../notification.schema';

describe('Notification Schema Validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validNotification = {
    id: validUUID,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    type: NotificationType.TASK_ASSIGNED,
    status: NotificationStatus.UNREAD,
    priority: 3,
    content: 'Test notificatie',
    recipientId: 'user123',
    taskId: '123e4567-e89b-12d3-a456-426614174001',
    metadata: { test: true }
  };

  describe('complete validation', () => {
    describe('content validation', () => {
      it('should validate a complete valid notification', async () => {
        const result = await validateNotification.complete(validNotification);
        expect(result).toEqual(validNotification);
      });

      it('should fail on empty content', async () => {
        const invalid = { ...validNotification, content: '' };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Content mag niet leeg zijn/);
      });

      it('should fail on content exceeding max length', async () => {
        const invalid = { ...validNotification, content: 'a'.repeat(2001) };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Content mag maximaal 2000 karakters zijn/);
      });

      it('should trim content whitespace', async () => {
        const withWhitespace = { ...validNotification, content: '  test content  ' };
        const result = await validateNotification.complete(withWhitespace);
        expect(result.content).toBe('test content');
      });

      it('should allow special characters in content', async () => {
        const withSpecialChars = {
          ...validNotification,
          content: 'Test @#$%^&*()_+ ñáéíóú 你好'
        };
        const result = await validateNotification.complete(withSpecialChars);
        expect(result.content).toBe(withSpecialChars.content);
      });
    });

    describe('type validation', () => {
      it.each(Object.values(NotificationType))('should allow valid notification type: %s', async (type) => {
        const notification = { ...validNotification, type };
        const result = await validateNotification.complete(notification);
        expect(result.type).toBe(type);
      });

      it('should fail on invalid notification type', async () => {
        const invalid = { ...validNotification, type: 'INVALID_TYPE' };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Type moet/);
      });

      it('should fail on missing notification type', async () => {
        const invalid = { ...validNotification, type: undefined };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Type is verplicht/);
      });
    });

    describe('status validation', () => {
      it.each(Object.values(NotificationStatus))('should allow valid status: %s', async (status) => {
        const notification = { ...validNotification, status };
        const result = await validateNotification.complete(notification);
        expect(result.status).toBe(status);
      });

      it('should fail on invalid notification status', async () => {
        const invalid = { ...validNotification, status: 'INVALID_STATUS' };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Status moet/);
      });
    });

    describe('priority validation', () => {
      it.each([1, 2, 3, 4, 5])('should allow valid priority level: %i', async (priority) => {
        const notification = { ...validNotification, priority };
        const result = await validateNotification.complete(notification);
        expect(result.priority).toBe(priority);
      });

      it('should fail on priority below minimum', async () => {
        const invalid = { ...validNotification, priority: 0 };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Prioriteit moet tussen/);
      });

      it('should fail on priority above maximum', async () => {
        const invalid = { ...validNotification, priority: 6 };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Prioriteit moet tussen/);
      });

      it('should fail on non-integer priority', async () => {
        const invalid = { ...validNotification, priority: 3.5 };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Prioriteit moet een geheel getal zijn/);
      });
    });

    describe('task relation validation', () => {
      it('should allow valid taskId', async () => {
        const result = await validateNotification.complete(validNotification);
        expect(result.taskId).toBe(validNotification.taskId);
      });

      it('should allow missing taskId', async () => {
        const withoutTask = { ...validNotification, taskId: undefined };
        const result = await validateNotification.complete(withoutTask);
        expect(result.taskId).toBeUndefined();
      });

      it('should fail on invalid taskId format', async () => {
        const invalid = { ...validNotification, taskId: 'invalid-uuid' };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Taak ID moet een geldig UUID zijn/);
      });
    });

    describe('recipient validation', () => {
      it('should require recipientId', async () => {
        const invalid = { ...validNotification, recipientId: undefined };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Ontvanger ID is verplicht/);
      });

      it('should fail on empty recipientId', async () => {
        const invalid = { ...validNotification, recipientId: '' };
        await expect(validateNotification.complete(invalid)).rejects.toThrow(/Ontvanger ID mag niet leeg zijn/);
      });
    });

    describe('metadata validation', () => {
      it('should allow valid metadata object', async () => {
        const result = await validateNotification.complete(validNotification);
        expect(result.metadata).toEqual(validNotification.metadata);
      });

      it('should allow missing metadata', async () => {
        const withoutMetadata = { ...validNotification, metadata: undefined };
        const result = await validateNotification.complete(withoutMetadata);
        expect(result.metadata).toBeUndefined();
      });

      it('should allow empty metadata object', async () => {
        const withEmptyMetadata = { ...validNotification, metadata: {} };
        const result = await validateNotification.complete(withEmptyMetadata);
        expect(result.metadata).toEqual({});
      });
    });
  });

  describe('create validation', () => {
    const validCreateData = {
      type: NotificationType.TASK_ASSIGNED,
      content: 'Test notificatie',
      recipientId: 'user123',
      taskId: '123e4567-e89b-12d3-a456-426614174001',
      metadata: { test: true }
    };

    describe('required fields and defaults', () => {
      it('should validate valid create data with defaults', async () => {
        const result = await validateNotification.create(validCreateData);
        expect(result).toEqual({
          ...validCreateData,
          status: NotificationStatus.UNREAD,
          priority: 3
        });
      });

      it('should fail on missing type', async () => {
        const { type: _type, ...invalid } = validCreateData;
        await expect(validateNotification.create(invalid)).rejects.toThrow(/Type is verplicht/);
      });

      it('should fail on missing content', async () => {
        const { content: _content, ...invalid } = validCreateData;
        await expect(validateNotification.create(invalid)).rejects.toThrow(/Content is verplicht/);
      });

      it('should fail on missing recipientId', async () => {
        const { recipientId: _recipientId, ...invalid } = validCreateData;
        await expect(validateNotification.create(invalid)).rejects.toThrow(/Ontvanger ID is verplicht/);
      });
    });

    describe('default overrides', () => {
      it('should allow overriding status default', async () => {
        const data = {
          ...validCreateData,
          status: NotificationStatus.READ
        };
        const result = await validateNotification.create(data);
        expect(result.status).toBe(NotificationStatus.READ);
      });

      it('should allow overriding priority default', async () => {
        const data = {
          ...validCreateData,
          priority: 5
        };
        const result = await validateNotification.create(data);
        expect(result.priority).toBe(5);
      });
    });

    describe('content validation', () => {
      it('should trim content on create', async () => {
        const data = {
          ...validCreateData,
          content: '  test content  '
        };
        const result = await validateNotification.create(data);
        expect(result.content).toBe('test content');
      });

      it('should fail on content exceeding max length', async () => {
        const data = {
          ...validCreateData,
          content: 'a'.repeat(2001)
        };
        await expect(validateNotification.create(data))
          .rejects.toThrow(/Content mag maximaal 2000 karakters zijn/);
      });

      it('should allow special characters in content', async () => {
        const data = {
          ...validCreateData,
          content: 'Test @#$%^&*()_+ ñáéíóú 你好'
        };
        const result = await validateNotification.create(data);
        expect(result.content).toBe(data.content);
      });
    });

    describe('task relation validation', () => {
      it('should allow creating without taskId', async () => {
        const { taskId: _taskId, ...withoutTask } = validCreateData;
        const result = await validateNotification.create(withoutTask);
        expect(result.taskId).toBeUndefined();
      });

      it('should validate taskId format when provided', async () => {
        const data = {
          ...validCreateData,
          taskId: 'invalid-uuid'
        };
        await expect(validateNotification.create(data))
          .rejects.toThrow(/Taak ID moet een geldig UUID zijn/);
      });
    });

    describe('metadata validation', () => {
      it('should allow optional metadata', async () => {
        const { metadata: _metadata, ...withoutMetadata } = validCreateData;
        const result = await validateNotification.create(withoutMetadata);
        expect(result.metadata).toBeUndefined();
      });

      it('should allow empty metadata object', async () => {
        const data = {
          ...validCreateData,
          metadata: {}
        };
        const result = await validateNotification.create(data);
        expect(result.metadata).toEqual({});
      });
    });
  });

  describe('update validation', () => {
    describe('partial updates', () => {
      it('should validate single field update', async () => {
        const updateData = { content: 'Updated content' };
        const result = await validateNotification.update(updateData);
        expect(result).toEqual(updateData);
      });

      it('should validate multiple field update', async () => {
        const updateData = {
          content: 'Updated content',
          priority: 4,
          status: NotificationStatus.READ
        };
        const result = await validateNotification.update(updateData);
        expect(result).toEqual(updateData);
      });

      it('should validate empty update', async () => {
        const result = await validateNotification.update({});
        expect(result).toEqual({});
      });
    });

    describe('field validations', () => {
      it('should validate content length in update', async () => {
        const invalid = { content: 'a'.repeat(2001) };
        await expect(validateNotification.update(invalid))
          .rejects.toThrow(/Content mag maximaal 2000 karakters zijn/);
      });

      it('should validate priority range in update', async () => {
        const invalid = { priority: 0 };
        await expect(validateNotification.update(invalid))
          .rejects.toThrow(/Prioriteit moet tussen/);
      });

      it('should validate type enum in update', async () => {
        const invalid = { type: 'INVALID_TYPE' };
        await expect(validateNotification.update(invalid))
          .rejects.toThrow(/Type moet/);
      });

      it('should validate status enum in update', async () => {
        const invalid = { status: 'INVALID_STATUS' };
        await expect(validateNotification.update(invalid))
          .rejects.toThrow(/Status moet/);
      });
    });

    describe('optional fields', () => {
      it('should allow removing taskId', async () => {
        const updateData = { taskId: undefined };
        const result = await validateNotification.update(updateData);
        expect(result.taskId).toBeUndefined();
      });

      it('should allow removing metadata', async () => {
        const updateData = { metadata: undefined };
        const result = await validateNotification.update(updateData);
        expect(result.metadata).toBeUndefined();
      });

      it('should validate taskId format when provided', async () => {
        const invalid = { taskId: 'invalid-uuid' };
        await expect(validateNotification.update(invalid))
          .rejects.toThrow(/Taak ID moet een geldig UUID zijn/);
      });
    });

    describe('content handling', () => {
      it('should trim whitespace in content update', async () => {
        const updateData = { content: '  updated content  ' };
        const result = await validateNotification.update(updateData);
        expect(result.content).toBe('updated content');
      });

      it('should allow special characters in content update', async () => {
        const updateData = { content: 'Update @#$%^&*()_+ ñáéíóú 你好' };
        const result = await validateNotification.update(updateData);
        expect(result.content).toBe(updateData.content);
      });
    });
  });
});