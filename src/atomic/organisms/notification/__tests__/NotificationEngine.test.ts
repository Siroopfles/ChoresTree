import { NotificationEngine } from '../NotificationEngine';
import { Client as DiscordClient } from 'discord.js';
import { TaskManagementService } from '../../../molecules/task/services/TaskManagementService';
import { 
  NotificationType,
  NotificationPriority,
} from '../../../atoms/notification/types';
import { NotificationError } from '../../../atoms/notification/errors';

jest.mock('discord.js');
jest.mock('../../../molecules/task/services/TaskManagementService');
jest.useFakeTimers();

describe('NotificationEngine', () => {
  let engine: NotificationEngine;
  let mockDiscordClient: jest.Mocked<DiscordClient>;
  let mockTaskService: jest.Mocked<TaskManagementService>;

  const validTemplate = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: NotificationType.TASK_REMINDER,
    title: 'Task Reminder: {taskName}',
    content: 'Your task {taskName} is due {dueDate}',
    variables: ['taskName', 'dueDate'],
  };

  beforeEach(() => {
    mockDiscordClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue({
          send: jest.fn().mockResolvedValue(undefined),
        }),
      },
    } as unknown as jest.Mocked<DiscordClient>;

    mockTaskService = {} as jest.Mocked<TaskManagementService>;

    engine = new NotificationEngine(mockDiscordClient, mockTaskService, {
      rateLimits: {
        requestsPerSecond: 2,
        burstSize: 1,
        windowMs: 1000,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTemplate', () => {
    it('should register a valid template', () => {
      const result = engine.registerTemplate(validTemplate);
      expect(result).toEqual(validTemplate);
    });

    it('should throw error for invalid template', () => {
      const invalidTemplate = {
        ...validTemplate,
        id: 'not-a-uuid',
      };

      expect(() => engine.registerTemplate(invalidTemplate)).toThrow();
    });
  });

  describe('scheduleNotification', () => {
    const variables = {
      taskName: 'Test Task',
      dueDate: 'tomorrow',
    };

    beforeEach(() => {
      engine.registerTemplate(validTemplate);
    });

    it('should schedule notification with template', async () => {
      const scheduledListener = jest.fn();
      engine.on('notification.scheduled', scheduledListener);

      await engine.scheduleNotification(
        validTemplate.id,
        variables,
        {
          cronExpression: '*/5 * * * *',
          recipientId: 'channel-123',
          serverId: 'server-456',
          priority: NotificationPriority.HIGH,
        }
      );

      expect(scheduledListener).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: validTemplate.id,
          priority: NotificationPriority.HIGH,
          content: {
            title: 'Task Reminder: Test Task',
            message: 'Your task Test Task is due tomorrow',
          },
        })
      );
    });

    it('should handle missing template variables', async () => {
      const incompleteVars = {
        taskName: 'Test Task',
      };

      await expect(
        engine.scheduleNotification(
          validTemplate.id,
          incompleteVars,
          {
            cronExpression: '*/5 * * * *',
            recipientId: 'channel-123',
            serverId: 'server-456',
          }
        )
      ).rejects.toThrow();
    });
  });

  describe('sendNotification', () => {
    const variables = {
      taskName: 'Test Task',
      dueDate: 'tomorrow',
    };

    beforeEach(() => {
      engine.registerTemplate(validTemplate);
    });

    it('should send immediate notification', async () => {
      const sentListener = jest.fn();
      engine.on('notification.sent', sentListener);

      await engine.sendNotification(
        validTemplate.id,
        variables,
        {
          recipientId: 'channel-123',
          serverId: 'server-456',
          priority: NotificationPriority.HIGH,
        }
      );

      expect(sentListener).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: validTemplate.id,
          priority: NotificationPriority.HIGH,
          content: {
            title: 'Task Reminder: Test Task',
            message: 'Your task Test Task is due tomorrow',
          },
        })
      );
    });

    it('should handle send errors', async () => {
      const errorListener = jest.fn();
      engine.on('error', errorListener);

      // Mock a send error
      mockDiscordClient.channels.fetch = jest.fn().mockRejectedValue(
        new Error('Discord API Error')
      );

      await expect(
        engine.sendNotification(
          validTemplate.id,
          variables,
          {
            recipientId: 'channel-123',
            serverId: 'server-456',
          }
        )
      ).rejects.toThrow();

      expect(errorListener).toHaveBeenCalledWith(
        expect.any(NotificationError)
      );
    });
  });

  describe('batch processing', () => {
    beforeEach(() => {
      engine.registerTemplate(validTemplate);
    });

    it('should process notifications in batches', async () => {
      const sentListener = jest.fn();
      engine.on('notification.sent', sentListener);

      const variables = {
        taskName: 'Test Task',
        dueDate: 'tomorrow',
      };

      // Queue multiple notifications
      for (let i = 0; i < 5; i++) {
        await engine.sendNotification(
          validTemplate.id,
          variables,
          {
            recipientId: 'channel-123',
            serverId: 'server-456',
          }
        );
      }

      // Let the batch processor run
      jest.advanceTimersByTime(1000);

      // Should respect rate limits
      expect(sentListener).toHaveBeenCalledTimes(2); // First batch
      
      jest.advanceTimersByTime(1000);
      expect(sentListener).toHaveBeenCalledTimes(4); // Second batch
    });
  });

  describe('getStats', () => {
    it('should return engine statistics', () => {
      engine.registerTemplate(validTemplate);

      const stats = engine.getStats();
      expect(stats).toEqual(
        expect.objectContaining({
          templates: 1,
          queueStats: expect.any(Object),
        })
      );
    });
  });
});