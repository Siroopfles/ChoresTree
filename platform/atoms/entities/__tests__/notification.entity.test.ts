import { NotificationEntity, NotificationType, NotificationStatus } from '../notification.entity';
import 'reflect-metadata';
import { TaskEntity } from '../task.entity';

describe('NotificationEntity', () => {
  let notification: NotificationEntity;

  beforeEach(() => {
    notification = new NotificationEntity();
    notification.type = NotificationType.TASK_ASSIGNED;
    notification.status = NotificationStatus.UNREAD;
    notification.priority = 3;
    notification.content = 'Test notification content';
    notification.recipientId = '123456789';
  });

  it('should create a notification with required fields', () => {
    expect(notification.type).toBe(NotificationType.TASK_ASSIGNED);
    expect(notification.status).toBe(NotificationStatus.UNREAD);
    expect(notification.priority).toBe(3);
    expect(notification.content).toBe('Test notification content');
    expect(notification.recipientId).toBe('123456789');
  });

  it('should have correct default values', () => {
    const defaultNotification = new NotificationEntity();
    expect(defaultNotification.status).toBe(NotificationStatus.UNREAD);
    expect(defaultNotification.priority).toBe(3);
  });

  it('should have encrypted fields marked with @Encrypt decorator', () => {
    const encryptedFields: string[] =
      Reflect.getMetadata('typeorm:encrypted_fields', NotificationEntity) || [];
    expect(encryptedFields).toContain('content');
  });

  it('should have encryption options for encrypted fields', () => {
    const contentOptions = Reflect.getMetadata(
      'typeorm:encrypted_fields:content',
      NotificationEntity,
    );
    expect(contentOptions).toBeDefined();
  });

  describe('Relations', () => {
    it('should have task relation', () => {
      const notification = new NotificationEntity();
      const task = new TaskEntity();
      task.id = 'task-1';

      notification.task = task;
      notification.taskId = task.id;

      expect(notification.task).toBe(task);
      expect(notification.taskId).toBe(task.id);
    });

    it('should allow null task relation', () => {
      const notification = new NotificationEntity();
      expect(notification.task).toBeUndefined();
      expect(notification.taskId).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should allow valid priority values', () => {
      const validPriorities = [1, 2, 3, 4, 5];
      validPriorities.forEach((priority) => {
        notification.priority = priority;
        expect(notification.priority).toBe(priority);
      });
    });

    it('should allow valid type values', () => {
      const validTypes = Object.values(NotificationType);
      validTypes.forEach((type) => {
        notification.type = type;
        expect(notification.type).toBe(type);
      });
    });

    it('should allow valid status values', () => {
      const validStatuses = Object.values(NotificationStatus);
      validStatuses.forEach((status) => {
        notification.status = status;
        expect(notification.status).toBe(status);
      });
    });

    it('should handle optional fields', () => {
      expect(notification.taskId).toBeUndefined();
      expect(notification.metadata).toBeUndefined();

      notification.taskId = 'test-task-id';
      notification.metadata = { importance: 'high' };

      expect(notification.taskId).toBe('test-task-id');
      expect(notification.metadata).toEqual({ importance: 'high' });
    });
  });
});
