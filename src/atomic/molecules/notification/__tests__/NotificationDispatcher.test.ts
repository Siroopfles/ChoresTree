import { NotificationDispatcher } from '../services/NotificationDispatcher';
import { Client as DiscordClient, TextChannel, Channel } from 'discord.js';
import { 
  NotificationStatus,
  NotificationType,
  NotificationPriority 
} from '../../../atoms/notification/types';
import { NotificationDeliveryError, NotificationRateLimitError } from '../../../atoms/notification/errors';

// Mock the discord.js types
type MockDiscordClient = {
  channels: {
    fetch: jest.Mock<Promise<Channel>>;
  };
};

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    channels: {
      fetch: jest.fn(),
    },
  })),
  TextChannel: jest.fn(),
}));

describe('NotificationDispatcher', () => {
  let dispatcher: NotificationDispatcher;
  let mockDiscordClient: MockDiscordClient;
  let mockChannel: jest.Mocked<TextChannel>;

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
    mockChannel = {
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TextChannel>;

    mockDiscordClient = {
      channels: {
        fetch: jest.fn(),
      },
    };

    mockDiscordClient.channels.fetch.mockResolvedValue(mockChannel);

    dispatcher = new NotificationDispatcher(mockDiscordClient as unknown as DiscordClient, {
      requestsPerSecond: 2,
      burstSize: 1,
      windowMs: 1000,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const successListener = jest.fn();
      dispatcher.on('notification.sent', successListener);

      await dispatcher.sendNotification(validNotification);

      expect(mockDiscordClient.channels.fetch).toHaveBeenCalledWith(validNotification.recipientId);
      expect(mockChannel.send).toHaveBeenCalled();
      expect(successListener).toHaveBeenCalledWith(expect.objectContaining({
        status: NotificationStatus.SENT,
      }));
    });

    it('should handle invalid channel type', async () => {
      const invalidChannel = {} as Channel;
      mockDiscordClient.channels.fetch.mockResolvedValueOnce(invalidChannel);
      
      const errorListener = jest.fn();
      dispatcher.on('notification.error', errorListener);

      await expect(dispatcher.sendNotification(validNotification))
        .rejects.toThrow(NotificationDeliveryError);

      expect(errorListener).toHaveBeenCalled();
    });

    it('should handle rate limits', async () => {
      const rateLimitListener = jest.fn();
      dispatcher.on('notification.rateLimit', rateLimitListener);

      // Send notifications quickly to trigger rate limit
      await dispatcher.sendNotification(validNotification);
      await dispatcher.sendNotification(validNotification);
      
      await expect(dispatcher.sendNotification(validNotification))
        .rejects.toThrow(NotificationRateLimitError);

      expect(rateLimitListener).toHaveBeenCalled();
    });

    it('should queue notifications when rate limited', async () => {
      const queueListener = jest.fn();
      dispatcher.on('notification.queued', queueListener);

      // Send notifications quickly to trigger rate limit
      await dispatcher.sendNotification(validNotification);
      await dispatcher.sendNotification(validNotification);
      
      try {
        await dispatcher.sendNotification(validNotification);
      } catch (error: unknown) {
        if (error instanceof NotificationRateLimitError) {
          expect(queueListener).toHaveBeenCalled();
        } else {
          throw error;
        }
      }
    });
  });

  describe('processRetryQueue', () => {
    it('should process queued notifications when rate limit expires', async () => {
      const successListener = jest.fn();
      dispatcher.on('notification.sent', successListener);

      // Trigger rate limit
      await dispatcher.sendNotification(validNotification);
      await dispatcher.sendNotification(validNotification);
      
      try {
        await dispatcher.sendNotification({
          ...validNotification,
          id: 'queued-notification',
        });
      } catch (error: unknown) {
        if (!(error instanceof NotificationRateLimitError)) {
          throw error;
        }
        // Expected rate limit error
      }

      // Wait for rate limit window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      await dispatcher.processRetryQueue(validNotification.serverId);

      expect(successListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'queued-notification',
          status: NotificationStatus.SENT,
        })
      );
    });

    it('should handle errors during retry processing', async () => {
      const errorListener = jest.fn();
      dispatcher.on('notification.error', errorListener);

      // Setup error condition
      mockChannel.send.mockRejectedValueOnce(new Error('Discord API Error'));

      // Trigger rate limit and queue notification
      await dispatcher.sendNotification(validNotification);
      await dispatcher.sendNotification(validNotification);
      
      try {
        await dispatcher.sendNotification({
          ...validNotification,
          id: 'error-notification',
        });
      } catch (error: unknown) {
        if (!(error instanceof NotificationRateLimitError)) {
          throw error;
        }
        // Expected rate limit error
      }

      // Wait for rate limit window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      await dispatcher.processRetryQueue(validNotification.serverId);

      expect(errorListener).toHaveBeenCalled();
    });
  });
});