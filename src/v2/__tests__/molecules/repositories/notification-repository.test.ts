import { getTestDb, withTestTransaction } from '@/v2/test/jest/setup-after-env';
import { NotificationEntity } from '@/v2/atomic/atoms/database/entities/NotificationEntity';
import { TaskEntity } from '@/v2/atomic/atoms/database/entities/TaskEntity';
import { ServerEntity } from '@/v2/atomic/atoms/database/entities/ServerEntity';
import { NotificationRepositoryImpl } from '@/v2/atomic/molecules/common/repositories/notification/NotificationRepositoryImpl';
import { DataSource } from 'typeorm';
import { MemoryCacheProvider } from '@/v2/core/cache/providers/MemoryCacheProvider';

// Setup mocks
const mockFindPendingNotifications = jest.fn().mockResolvedValue([]);
const mockFindRetryableNotifications = jest.fn().mockResolvedValue([]);
const mockFindNotifications = jest.fn().mockResolvedValue([]);
const mockGetNotificationStatistics = jest.fn().mockResolvedValue({
  total: 0,
  pending: 0,
  failed: 0,
  sent: 0,
  retryable: 0
});

// Mock the entire class
jest.mock('@/v2/atomic/molecules/common/query/builders/NotificationQueryBuilder', () => {
  return {
    NotificationQueryBuilder: jest.fn().mockImplementation(() => ({
      findPendingNotifications: mockFindPendingNotifications,
      findRetryableNotifications: mockFindRetryableNotifications,
      findNotifications: mockFindNotifications,
      getNotificationStatistics: mockGetNotificationStatistics
    }))
  };
});

describe('NotificationRepository (Molecules)', () => {
  let dataSource: DataSource;
  let notificationRepository: NotificationRepositoryImpl;
  let server: ServerEntity;
  let task: TaskEntity;
  let cacheProvider: MemoryCacheProvider;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();

    // Initialize repository with cache
    const typeormRepo = dataSource.getRepository(NotificationEntity);
    cacheProvider = new MemoryCacheProvider();
    notificationRepository = new NotificationRepositoryImpl(typeormRepo, cacheProvider);

    // Reset all mocks
    mockFindPendingNotifications.mockClear();
    mockFindRetryableNotifications.mockClear();
    mockFindNotifications.mockClear();
    mockGetNotificationStatistics.mockClear();

    // Create test server
    server = new ServerEntity();
    server.serverId = '123456789';
    server.serverName = 'Test Server';
    server.timezone = 'Europe/Amsterdam';
    server.language = 'nl';
    await dataSource.manager.save(ServerEntity, server);

    // Create test task
    task = new TaskEntity();
    task.title = 'Test Task';
    task.description = 'Test Description';
    task.serverId = server.id;
    task.channelId = '123456';
    task.createdByUserId = 'user123';
    task.priority = 'MEDIUM';
    await dataSource.manager.save(TaskEntity, task);
  });

  describe('Basis Notificatie Operaties', () => {
    it('moet een nieuwe notificatie kunnen aanmaken en ophalen', async () => {
      await withTestTransaction(async () => {
        // Create notification
        const notification = await notificationRepository.create({
          type: 'DEADLINE',
          message: 'Test notification',
          scheduledFor: new Date(),
          channelId: '123456',
          taskId: task.id,
          targetUserId: 'user123'
        } as NotificationEntity);

        expect(notification).toBeDefined();
        expect(notification.id).toBeDefined();
        expect(notification.type).toBe('DEADLINE');
        expect(notification.status).toBe('PENDING');

        // Verify can be found
        const found = await notificationRepository.findById(notification.id);
        expect(found).toBeDefined();
        expect(found?.message).toBe('Test notification');
      });
    });

    it('moet notificatie status kunnen updaten met error tracking', async () => {
      await withTestTransaction(async () => {
        // Create notification
        const notification = await notificationRepository.create({
          type: 'REMINDER',
          message: 'Status test',
          scheduledFor: new Date(),
          channelId: '123456',
          taskId: task.id,
          targetUserId: 'user123'
        } as NotificationEntity);

        // Update to failed with error
        const failed = await notificationRepository.updateStatus(
          notification.id,
          'FAILED',
          'Test error message'
        );

        expect(failed).toBeDefined();
        expect(failed?.status).toBe('FAILED');
        expect(failed?.lastError).toBe('Test error message');
        expect(failed?.retryCount).toBe(1);

        // Update to sent
        const sent = await notificationRepository.updateStatus(notification.id, 'SENT');
        expect(sent).toBeDefined();
        expect(sent?.status).toBe('SENT');
      });
    });
  });

  describe('Notificatie Queries', () => {
    it('moet due notificaties kunnen vinden', async () => {
      await withTestTransaction(async () => {
        // Setup mock response
        const mockNotification = new NotificationEntity();
        mockNotification.id = 'test-id';
        mockNotification.status = 'PENDING';
        mockNotification.scheduledFor = new Date(Date.now() - 1000); // 1 second ago
        mockFindPendingNotifications.mockResolvedValueOnce([mockNotification]);

        // Find due notifications
        const notifications = await notificationRepository.findDueNotifications();
        expect(notifications).toHaveLength(1);
        expect(notifications[0].id).toBe('test-id');

        // Verify caching
        const cacheKey = 'due-notifications:[]';
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeDefined();
      });
    });

    it('moet notificaties per taak kunnen vinden', async () => {
      await withTestTransaction(async () => {
        // Setup mock response
        const mockNotifications = [
          { type: 'DEADLINE', taskId: task.id } as NotificationEntity,
          { type: 'REMINDER', taskId: task.id } as NotificationEntity
        ];
        mockFindNotifications.mockResolvedValueOnce(mockNotifications);

        // Find by task
        const notifications = await notificationRepository.findByTaskId(task.id);
        expect(notifications).toHaveLength(2);
        expect(notifications.map(n => n.type)).toContain('DEADLINE');
        expect(notifications.map(n => n.type)).toContain('REMINDER');
      });
    });
  });

  describe('Recurring Notificaties', () => {
    it('moet recurring notificaties kunnen verwerken', async () => {
      await withTestTransaction(async () => {
        // Create recurring notification
        const notification = await notificationRepository.create({
          type: 'REMINDER',
          message: 'Recurring test',
          scheduledFor: new Date(),
          channelId: '123456',
          taskId: task.id,
          targetUserId: 'user123',
          isRecurring: true,
          recurrencePattern: 'DAILY',
          recurrenceEndDate: new Date(Date.now() + 86400000) // 1 day from now
        } as NotificationEntity);

        // Process recurring
        const nextDate = new Date(Date.now() + 3600000); // 1 hour from now
        const processed = await notificationRepository.processRecurringNotification(
          notification.id,
          nextDate
        );

        expect(processed).toBeDefined();
        expect(processed?.scheduledFor).toEqual(nextDate);
        expect(processed?.isRecurring).toBe(true);
        expect(processed?.status).toBe('PENDING');
        expect(processed?.retryCount).toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('moet null teruggeven voor niet-bestaande notificaties', async () => {
      await withTestTransaction(async () => {
        const result = await notificationRepository.findById('non-existent-id');
        expect(result).toBeNull();
      });
    });

    it('moet null teruggeven bij updaten van niet-bestaande notificatie', async () => {
      await withTestTransaction(async () => {
        const result = await notificationRepository.updateStatus('non-existent-id', 'SENT');
        expect(result).toBeNull();
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    await dataSource.manager.delete(NotificationEntity, {});
    await dataSource.manager.delete(TaskEntity, {});
    await dataSource.manager.delete(ServerEntity, {});
  });
});