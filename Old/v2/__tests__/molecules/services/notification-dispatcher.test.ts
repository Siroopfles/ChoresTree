import { NotificationDispatcher } from '@/v2/atomic/molecules/services/notification/NotificationDispatcher';
import { NotificationRepository, Notification, NotificationChannel } from '@/v2/atomic/molecules/repositories/notification/NotificationRepository';
import { TemplateEngine } from '@/v2/atomic/molecules/services/template/TemplateEngine';
import { DeliveryProvider } from '@/v2/atomic/molecules/services/delivery/DeliveryProvider';
import { NotificationStatus } from '@/v2/atomic/molecules/services/notification/types/NotificationStatus';
import { TaskNotificationData } from '@/v2/atomic/molecules/services/notification/types/NotificationData';

// Mock repositories and dependencies
jest.mock('@/v2/atomic/molecules/repositories/notification/NotificationRepository');
jest.mock('@/v2/atomic/molecules/services/template/TemplateEngine');
jest.mock('@/v2/atomic/molecules/services/delivery/DeliveryProvider');

describe('NotificationDispatcher (Molecules)', () => {
  let notificationDispatcher: NotificationDispatcher;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let mockTemplateEngine: jest.Mocked<TemplateEngine>;
  let mockDeliveryProvider: jest.Mocked<DeliveryProvider>;

  const now = new Date();

  const createMockNotification = (override: Partial<Notification> = {}): Notification => ({
    id: 'notif-1',
    template: 'task-reminder',
    data: { taskId: 'task-1', taskTitle: 'Test Task' } as TaskNotificationData,
    channel: 'discord' as NotificationChannel,
    recipient: 'channel-123',
    scheduledFor: now,
    status: NotificationStatus.PENDING,
    createdAt: now,
    updatedAt: now,
    ...override
  });

  beforeEach(() => {
    // Reset mocks
    mockNotificationRepo = {
      findPendingNotifications: jest.fn(),
      updateStatus: jest.fn(),
      incrementRetryCount: jest.fn(),
      markAsDelivered: jest.fn(),
      findByFilters: jest.fn(),
      cleanupOldNotifications: jest.fn()
    } as unknown as jest.Mocked<NotificationRepository>;

    mockTemplateEngine = {
      render: jest.fn()
    } as unknown as jest.Mocked<TemplateEngine>;

    mockDeliveryProvider = {
      send: jest.fn()
    } as unknown as jest.Mocked<DeliveryProvider>;

    // Initialize service
    notificationDispatcher = new NotificationDispatcher(
      mockNotificationRepo,
      mockTemplateEngine,
      mockDeliveryProvider
    );
  });

  describe('Notification Scheduling', () => {
    it('moet pending notificaties ophalen en verwerken', async () => {
      const pendingNotifications = [
        createMockNotification()
      ];

      mockNotificationRepo.findPendingNotifications.mockResolvedValue(pendingNotifications);
      mockTemplateEngine.render.mockResolvedValue('Je taak staat gepland voor vandaag');
      mockDeliveryProvider.send.mockResolvedValue({ success: true });

      await notificationDispatcher.processScheduledNotifications();

      expect(mockNotificationRepo.findPendingNotifications).toHaveBeenCalled();
      expect(mockTemplateEngine.render).toHaveBeenCalledWith('task-reminder', { taskId: 'task-1', taskTitle: 'Test Task' });
      expect(mockDeliveryProvider.send).toHaveBeenCalled();
      expect(mockNotificationRepo.markAsDelivered).toHaveBeenCalledWith('notif-1');
    });

    it('moet notificaties filteren die nog niet verzonden mogen worden', async () => {
      const futureDate = new Date(now.getTime() + 3600000); // 1 uur in de toekomst
      const notifications = [
        createMockNotification({ scheduledFor: futureDate })
      ];

      mockNotificationRepo.findPendingNotifications.mockResolvedValue(notifications);

      await notificationDispatcher.processScheduledNotifications();

      expect(mockDeliveryProvider.send).not.toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('moet templates correct renderen met data', async () => {
      const notification = createMockNotification({
        template: 'task-assigned',
        data: {
          taskId: 'task-1',
          taskTitle: 'Test Task',
          assignee: 'John Doe'
        } as TaskNotificationData
      });

      const expectedContent = 'Taak "Test Task" is toegewezen aan John Doe';
      mockTemplateEngine.render.mockResolvedValue(expectedContent);
      mockDeliveryProvider.send.mockResolvedValue({ success: true });

      await notificationDispatcher.processNotification(notification);

      expect(mockTemplateEngine.render).toHaveBeenCalledWith('task-assigned', notification.data);
      expect(mockDeliveryProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ content: expectedContent })
      );
    });

    it('moet template errors netjes afhandelen', async () => {
      const notification = createMockNotification({ template: 'invalid-template' });

      mockTemplateEngine.render.mockRejectedValue(new Error('Template not found'));

      await notificationDispatcher.processNotification(notification);

      expect(mockNotificationRepo.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        NotificationStatus.ERROR,
        'Template rendering failed'
      );
    });
  });

  describe('Retry Logic', () => {
    it('moet gefaalde notificaties opnieuw proberen met exponential backoff', async () => {
      const failedNotification = createMockNotification({
        status: NotificationStatus.FAILED,
        retryCount: 1,
        lastAttempt: new Date(now.getTime() - 900000) // 15 minuten geleden
      });

      mockNotificationRepo.findPendingNotifications.mockResolvedValue([failedNotification]);
      mockDeliveryProvider.send.mockResolvedValue({ success: true });

      await notificationDispatcher.processScheduledNotifications();

      expect(mockDeliveryProvider.send).toHaveBeenCalled();
      expect(mockNotificationRepo.incrementRetryCount).toHaveBeenCalledWith('notif-1');
    });

    it('moet notificatie permanent markeren als mislukt na max retries', async () => {
      const maxRetriesNotification = createMockNotification({
        status: NotificationStatus.FAILED,
        retryCount: 5
      });

      mockNotificationRepo.findPendingNotifications.mockResolvedValue([maxRetriesNotification]);
      mockDeliveryProvider.send.mockRejectedValue(new Error('Delivery failed'));

      await notificationDispatcher.processScheduledNotifications();

      expect(mockNotificationRepo.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        NotificationStatus.PERMANENTLY_FAILED,
        'Max retry attempts reached'
      );
    });
  });

  describe('Delivery Management', () => {
    it('moet verschillende delivery providers ondersteunen', async () => {
      const emailNotification = createMockNotification({
        id: 'notif-1',
        channel: 'email',
        recipient: 'user@example.com'
      });

      const discordNotification = createMockNotification({
        id: 'notif-2',
        channel: 'discord',
        recipient: 'channel-id'
      });

      mockNotificationRepo.findPendingNotifications.mockResolvedValue([
        emailNotification,
        discordNotification
      ]);
      mockDeliveryProvider.send.mockResolvedValue({ success: true });

      await notificationDispatcher.processScheduledNotifications();

      expect(mockDeliveryProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'email' })
      );
      expect(mockDeliveryProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'discord' })
      );
    });

    it('moet delivery status correct bijwerken', async () => {
      const notification = createMockNotification();

      mockNotificationRepo.findPendingNotifications.mockResolvedValue([notification]);
      mockDeliveryProvider.send.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        timestamp: now
      });

      await notificationDispatcher.processScheduledNotifications();

      expect(mockNotificationRepo.markAsDelivered).toHaveBeenCalledWith(
        'notif-1',
        expect.objectContaining({
          messageId: 'msg-123'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('moet tijdelijke netwerk errors correct afhandelen', async () => {
      const notification = createMockNotification();

      mockNotificationRepo.findPendingNotifications.mockResolvedValue([notification]);
      mockDeliveryProvider.send.mockRejectedValue(new Error('Network timeout'));

      await notificationDispatcher.processScheduledNotifications();

      expect(mockNotificationRepo.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        NotificationStatus.FAILED,
        'Temporary delivery failure - will retry'
      );
    });

    it('moet permanent gefaalde notificaties correct markeren', async () => {
      const notification = createMockNotification();

      mockNotificationRepo.findPendingNotifications.mockResolvedValue([notification]);
      mockDeliveryProvider.send.mockRejectedValue({
        permanent: true,
        message: 'Invalid recipient'
      });

      await notificationDispatcher.processScheduledNotifications();

      expect(mockNotificationRepo.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        NotificationStatus.PERMANENTLY_FAILED,
        'Invalid recipient'
      );
    });
  });
});