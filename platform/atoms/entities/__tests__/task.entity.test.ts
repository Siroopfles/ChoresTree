import { TaskEntity, TaskStatus } from '../task.entity';
import 'reflect-metadata';
import { NotificationEntity } from '../notification.entity';
import { TaskRolesEntity } from '../task-roles.entity';

describe('TaskEntity', () => {
  let task: TaskEntity;

  beforeEach(() => {
    task = new TaskEntity();
    task.title = 'Test Task';
    task.status = TaskStatus.TODO;
    task.priority = 3;
  });

  it('should create a task with required fields', () => {
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe(TaskStatus.TODO);
    expect(task.priority).toBe(3);
  });

  it('should have correct default values', () => {
    const defaultTask = new TaskEntity();
    expect(defaultTask.status).toBe(TaskStatus.TODO);
    expect(defaultTask.priority).toBe(3);
  });

  it('should have encrypted fields marked with @Encrypt decorator', () => {
    const encryptedFields: string[] =
      Reflect.getMetadata('typeorm:encrypted_fields', TaskEntity) || [];
    expect(encryptedFields).toContain('title');
    expect(encryptedFields).toContain('description');
  });

  it('should have encryption options for encrypted fields', () => {
    const titleOptions = Reflect.getMetadata('typeorm:encrypted_fields:title', TaskEntity);
    const descriptionOptions = Reflect.getMetadata(
      'typeorm:encrypted_fields:description',
      TaskEntity,
    );

    expect(titleOptions).toBeDefined();
    expect(descriptionOptions).toBeDefined();
  });

  describe('Relations', () => {
    it('should have notifications relation', () => {
      const task = new TaskEntity();
      const notification = new NotificationEntity();

      task.notifications = [notification];
      expect(task.notifications).toHaveLength(1);
      expect(task.notifications[0]).toBe(notification);
    });

    it('should have taskRoles relation', () => {
      const task = new TaskEntity();
      const taskRole = new TaskRolesEntity();

      task.taskRoles = [taskRole];
      expect(task.taskRoles).toHaveLength(1);
      expect(task.taskRoles[0]).toBe(taskRole);
    });

    it('should initialize with empty relations', () => {
      const task = new TaskEntity();
      expect(task.notifications).toBeUndefined();
      expect(task.taskRoles).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should allow valid priority values', () => {
      const validPriorities = [1, 2, 3, 4, 5];
      validPriorities.forEach((priority) => {
        task.priority = priority;
        expect(task.priority).toBe(priority);
      });
    });

    it('should allow valid status values', () => {
      const validStatuses = Object.values(TaskStatus);
      validStatuses.forEach((status) => {
        task.status = status;
        expect(task.status).toBe(status);
      });
    });

    it('should handle optional fields', () => {
      expect(task.description).toBeUndefined();
      expect(task.dueDate).toBeUndefined();
      expect(task.assigneeId).toBeUndefined();

      const dueDate = new Date();
      task.description = 'Test Description';
      task.dueDate = dueDate;
      task.assigneeId = 'test-user-id';

      expect(task.description).toBe('Test Description');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assigneeId).toBe('test-user-id');
    });
  });
});
