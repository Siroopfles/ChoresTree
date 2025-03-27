import { NotificationScheduler } from '../services/NotificationScheduler';
import { NotificationDispatcher } from '../services/NotificationDispatcher';
import { TaskManagementService } from '../../task/services/TaskManagementService';
import { 
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus 
} from '../../../atoms/notification/types';

jest.mock('../services/NotificationDispatcher');
jest.mock('../../task/services/TaskManagementService');
jest.useFakeTimers();

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let mockDispatcher: jest.Mocked<NotificationDispatcher>;
  let mockTaskService: jest.Mocked<TaskManagementService>;

  const validNotification = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    templateId: '987fcdeb-51d2-4a56-b789-123456789012',
    type: NotificationType.TASK_REMINDER,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    recipientId: 'channel-123',
    serverId: 'server-456',
    content: {
      title: 'Test Notification',
      message: 'Test message content',
    },
    variables: {},
    createdAt: new Date(),
    scheduledFor: new Date(),
    retryCount: 0,
    maxRetries: 3,
  };

  beforeEach(() => {
    mockDispatcher = {
      sendNotification: jest.fn(),
    } as unknown as jest.Mocked<NotificationDispatcher>;

    mockTaskService = {} as jest.Mocked<TaskManagementService>;

    scheduler = new NotificationScheduler(mockDispatcher, mockTaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleNotification', () => {
    it('should schedule notification with cron expression', () => {
      const scheduledListener = jest.fn();
      scheduler.on('notification.scheduled', scheduledListener);

      scheduler.scheduleNotification(validNotification, {
        cronExpression: '*/5 * * * *', // Every 5 minutes
      });

      expect(scheduledListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: validNotification.id,
        })
      );
    });

    it('should execute scheduled notification when cron triggers', () => {
      scheduler.scheduleNotification(validNotification, {
        cronExpression: '*/5 * * * *', // Every 5 minutes
      });

      // Advance time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(mockDispatcher.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: validNotification.id,
        })
      );
    });
  });

  describe('queueNotification', () => {
    it('should queue notification with correct priority', () => {
      const queuedListener = jest.fn();
      scheduler.on('notification.queued', queuedListener);

      scheduler.queueNotification(validNotification);

      expect(queuedListener).toHaveBeenCalledWith(validNotification);
    });

    it('should process queued notifications in priority order', async () => {
      const highPriorityNotification = {
        ...validNotification,
        id: 'high-priority',
        priority: NotificationPriority.HIGH,
      };

      const mediumPriorityNotification = {
        ...validNotification,
        id: 'medium-priority',
        priority: NotificationPriority.MEDIUM,
      };

      const lowPriorityNotification = {
        ...validNotification,
        id: 'low-priority',
        priority: NotificationPriority.LOW,
      };

      // Queue notifications in reverse priority order
      scheduler.queueNotification(lowPriorityNotification);
      scheduler.queueNotification(mediumPriorityNotification);
      scheduler.queueNotification(highPriorityNotification);

      // Let the batch processor run
      jest.advanceTimersByTime(1000);

      const sendCalls = mockDispatcher.sendNotification.mock.calls;
      const firstCall = sendCalls[0][0] as Notification;
      const secondCall = sendCalls[1][0] as Notification;
      const thirdCall = sendCalls[2][0] as Notification;

      expect(firstCall.id).toBe('high-priority');
      expect(secondCall.id).toBe('medium-priority');
      expect(thirdCall.id).toBe('low-priority');
    });

    it('should respect batch size limits', () => {
      scheduler.updateBatchOptions({ maxBatchSize: 2 });

      // Queue more notifications than batch size
      for (let i = 0; i < 5; i++) {
        scheduler.queueNotification({
          ...validNotification,
          id: `notification-${i}`,
        });
      }

      // Let the batch processor run
      jest.advanceTimersByTime(1000);

      expect(mockDispatcher.sendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelScheduledNotification', () => {
    it('should cancel scheduled notification', () => {
      const cancelledListener = jest.fn();
      scheduler.on('notification.cancelled', cancelledListener);

      scheduler.scheduleNotification(validNotification, {
        cronExpression: '*/5 * * * *',
      });

      scheduler.cancelScheduledNotification(validNotification.id);

      // Advance time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(mockDispatcher.sendNotification).not.toHaveBeenCalled();
      expect(cancelledListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: validNotification.id,
        })
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return correct queue statistics', () => {
      scheduler.queueNotification({
        ...validNotification,
        priority: NotificationPriority.HIGH,
      });

      scheduler.queueNotification({
        ...validNotification,
        priority: NotificationPriority.MEDIUM,
      });

      const stats = scheduler.getQueueStats();
      expect(stats[NotificationPriority.HIGH]).toBe(1);
      expect(stats[NotificationPriority.MEDIUM]).toBe(1);
      expect(stats[NotificationPriority.LOW]).toBe(0);
    });
  });
});