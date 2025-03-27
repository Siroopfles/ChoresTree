import { NotificationUpdatedEventValidator, NotificationUpdatedEvent } from '../../../../../atomic/atoms/notification/validators/events/NotificationUpdatedEventValidator';

describe('NotificationUpdatedEventValidator (Atoms)', () => {
  describe('Basis Validatie', () => {
    const validEvent: NotificationUpdatedEvent = {
      notificationId: 'notification123',
      changes: {},
      timestamp: new Date()
    };

    it('should validate een geldig event', () => {
      const result = NotificationUpdatedEventValidator.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should verplichte velden valideren', () => {
      // Test zonder notificationId
      const missingNotificationId = {
        changes: {},
        timestamp: new Date()
      };
      const resultNoId = NotificationUpdatedEventValidator.safeParse(missingNotificationId);
      expect(resultNoId.success).toBe(false);
      if (!resultNoId.success) {
        expect(resultNoId.error.issues[0].path).toEqual(['notificationId']);
      }

      // Test zonder timestamp
      const missingTimestamp = {
        notificationId: 'notification123',
        changes: {}
      };
      const resultNoTimestamp = NotificationUpdatedEventValidator.safeParse(missingTimestamp);
      expect(resultNoTimestamp.success).toBe(false);
      if (!resultNoTimestamp.success) {
        expect(resultNoTimestamp.error.issues[0].path).toEqual(['timestamp']);
      }

      // Test zonder changes object
      const missingChanges = {
        notificationId: 'notification123',
        timestamp: new Date()
      };
      const resultNoChanges = NotificationUpdatedEventValidator.safeParse(missingChanges);
      expect(resultNoChanges.success).toBe(false);
      if (!resultNoChanges.success) {
        expect(resultNoChanges.error.issues[0].path).toEqual(['changes']);
      }
    });
  });

  describe('Changes Object Validatie', () => {
    const baseEvent = {
      notificationId: 'notification123',
      timestamp: new Date()
    };

    it('should lege changes accepteren', () => {
      const result = NotificationUpdatedEventValidator.safeParse({
        ...baseEvent,
        changes: {}
      });
      expect(result.success).toBe(true);
    });

    it('should type enum in changes valideren', () => {
      const validTypes = ['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE'] as const;
      
      // Test geldige types
      for (const type of validTypes) {
        const result = NotificationUpdatedEventValidator.safeParse({
          ...baseEvent,
          changes: { type }
        });
        expect(result.success).toBe(true);
      }

      // Test ongeldig type
      const result = NotificationUpdatedEventValidator.safeParse({
        ...baseEvent,
        changes: { type: 'INVALID_TYPE' }
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['changes', 'type']);
      }
    });

    it('should status enum in changes valideren', () => {
      const validStatuses = ['PENDING', 'SENT', 'FAILED', 'CANCELLED'] as const;
      
      // Test geldige statuses
      for (const status of validStatuses) {
        const result = NotificationUpdatedEventValidator.safeParse({
          ...baseEvent,
          changes: { status }
        });
        expect(result.success).toBe(true);
      }

      // Test ongeldige status
      const result = NotificationUpdatedEventValidator.safeParse({
        ...baseEvent,
        changes: { status: 'INVALID_STATUS' }
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['changes', 'status']);
      }
    });
  });

  describe('Changes Veld Types', () => {
    const baseEvent = {
      notificationId: 'notification123',
      timestamp: new Date()
    };

    it('should datum velden in changes valideren', () => {
      const dateFields = ['scheduledFor', 'recurrenceEndDate'] as const;
      const invalidValues = ['invalid-date', 123, {}, [], true, null];

      for (const field of dateFields) {
        for (const invalidValue of invalidValues) {
          const result = NotificationUpdatedEventValidator.safeParse({
            ...baseEvent,
            changes: { [field]: invalidValue }
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].path).toEqual(['changes', field]);
          }
        }
      }
    });

    it('should string velden in changes valideren', () => {
      const stringFields = [
        'channelId',
        'targetUserId',
        'targetRoleId',
        'recurrencePattern',
        'customMessage'
      ] as const;
      const invalidValues = [123, true, {}, []];

      for (const field of stringFields) {
        for (const invalidValue of invalidValues) {
          const result = NotificationUpdatedEventValidator.safeParse({
            ...baseEvent,
            changes: { [field]: invalidValue }
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].path).toEqual(['changes', field]);
          }
        }
      }
    });

    it('should boolean veld in changes valideren', () => {
      const invalidValues = ['true', 1, 'yes', {}, [], null];

      for (const invalidValue of invalidValues) {
        const result = NotificationUpdatedEventValidator.safeParse({
          ...baseEvent,
          changes: { isRecurring: invalidValue }
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['changes', 'isRecurring']);
        }
      }
    });
  });

  describe('Volledige Updates', () => {
    it('should een complete set changes accepteren', () => {
      const completeEvent: NotificationUpdatedEvent = {
        notificationId: 'notification123',
        changes: {
          type: 'REMINDER',
          status: 'PENDING',
          scheduledFor: new Date(),
          channelId: 'channel123',
          targetUserId: 'user123',
          targetRoleId: 'role123',
          isRecurring: true,
          recurrencePattern: '0 0 * * *',
          recurrenceEndDate: new Date(),
          customMessage: 'Updated message'
        },
        timestamp: new Date()
      };

      const result = NotificationUpdatedEventValidator.safeParse(completeEvent);
      expect(result.success).toBe(true);
    });
  });
});