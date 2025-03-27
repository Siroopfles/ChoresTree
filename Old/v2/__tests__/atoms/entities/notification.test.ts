import { getTestDb, withTestTransaction } from '../../../test/jest/setup-after-env';
import { NotificationEntity } from '../../../atomic/atoms/database/entities/NotificationEntity';
import { DataSource } from 'typeorm';
import { TestSeeder } from '../../../test/utils/seeders';

describe('Notification Entity (Atoms)', () => {
  let dataSource: DataSource;
  let testSeeder: TestSeeder;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();
    testSeeder = new TestSeeder(dataSource);
  });

  describe('Entity Constructie & Validatie', () => {
    it('should create notification with required properties', async () => {
      await withTestTransaction(async () => {
        const notification = await testSeeder.seedNotification();

        expect(notification.id).toBeDefined();
        expect(notification.type).toBe('REMINDER');
        expect(notification.status).toBe('PENDING');
        expect(notification.scheduledFor).toBeDefined();
        expect(notification.channelId).toBeDefined();
        expect(notification.taskId).toBeDefined();
        expect(notification.task).toBeDefined();
        expect(notification.createdAt).toBeDefined();
        expect(notification.updatedAt).toBeDefined();
      });
    });

    it('should enforce required fields for NotificationEntity', async () => {
      await withTestTransaction(async () => {
        const notification = new NotificationEntity();
        // Missing required fields
        await expect(
          dataSource.manager.save(NotificationEntity, notification)
        ).rejects.toThrow();
      });
    });
  });

  describe('Default Waardes', () => {
    it('should set correct default values', async () => {
      await withTestTransaction(async () => {
        const notification = await testSeeder.seedNotification();
        
        expect(notification.status).toBe('PENDING');
        expect(notification.isRecurring).toBe(false);
        expect(notification.retryCount).toBe(0);
      });
    });
  });

  describe('Type Validatie', () => {
    it('should validate notification type enum', async () => {
      await withTestTransaction(async () => {
        // Test met ongeldig type
        await expect(
          testSeeder.seedNotification({
            type: 'INVALID_TYPE' as NotificationEntity['type']
          })
        ).rejects.toThrow();

        // Test met geldig type
        const notification = await testSeeder.seedNotification({
          type: 'DEADLINE'
        });
        expect(notification.type).toBe('DEADLINE');
      });
    });

    it('should validate status enum', async () => {
      await withTestTransaction(async () => {
        // Test met ongeldige status
        await expect(
          testSeeder.seedNotification({
            status: 'INVALID_STATUS' as NotificationEntity['status']
          })
        ).rejects.toThrow();

        // Test met geldige status
        const notification = await testSeeder.seedNotification({
          status: 'SENT'
        });
        expect(notification.status).toBe('SENT');
      });
    });
  });

  describe('Helper Methods', () => {
    it('should correctly determine if notification is due', async () => {
      await withTestTransaction(async () => {
        const pastDate = new Date(Date.now() - 1000); // 1 second ago
        const futureDate = new Date(Date.now() + 1000); // 1 second in future

        const pastNotification = await testSeeder.seedNotification({
          scheduledFor: pastDate
        });
        const futureNotification = await testSeeder.seedNotification({
          scheduledFor: futureDate
        });

        expect(pastNotification.isDue()).toBe(true);
        expect(futureNotification.isDue()).toBe(false);
      });
    });

    it('should correctly determine if notification can be retried', async () => {
      await withTestTransaction(async () => {
        const failedNotification = await testSeeder.seedNotification({
          status: 'FAILED',
          retryCount: 2
        });
        const maxRetriesNotification = await testSeeder.seedNotification({
          status: 'FAILED',
          retryCount: 3
        });

        expect(failedNotification.canRetry()).toBe(true);
        expect(maxRetriesNotification.canRetry()).toBe(false);
      });
    });

    it('should calculate correct time until scheduled', async () => {
      await withTestTransaction(async () => {
        const futureDate = new Date(Date.now() + 1000); // 1 second in future
        const notification = await testSeeder.seedNotification({
          scheduledFor: futureDate
        });

        const timeUntil = notification.getTimeUntilScheduled();
        expect(timeUntil).toBeGreaterThan(0);
        expect(timeUntil).toBeLessThanOrEqual(1000);
      });
    });

    it('should correctly determine if recurrence is active', async () => {
      await withTestTransaction(async () => {
        const futureEndDate = new Date(Date.now() + 86400000); // 1 day in future
        const pastEndDate = new Date(Date.now() - 86400000); // 1 day in past

        const activeRecurring = await testSeeder.seedNotification({
          isRecurring: true,
          recurrenceEndDate: futureEndDate
        });
        const inactiveRecurring = await testSeeder.seedNotification({
          isRecurring: true,
          recurrenceEndDate: pastEndDate
        });
        const nonRecurring = await testSeeder.seedNotification({
          isRecurring: false
        });

        expect(activeRecurring.isRecurrenceActive()).toBe(true);
        expect(inactiveRecurring.isRecurrenceActive()).toBe(false);
        expect(nonRecurring.isRecurrenceActive()).toBe(false);
      });
    });
  });

  afterEach(async () => {
    await withTestTransaction(async () => {
      await testSeeder.cleanup();
    });
  });
});