import { NotificationCreatedEventValidator, NotificationCreatedEvent } from '../../../../../atomic/atoms/notification/validators/events/NotificationCreatedEventValidator';

describe('NotificationCreatedEventValidator (Atoms)', () => {
  describe('Basis Validatie', () => {
    const validEvent: NotificationCreatedEvent = {
      notificationId: 'notification123',
      type: 'REMINDER',
      scheduledFor: new Date(),
      channelId: 'channel123',
      taskId: 'task123',
      isRecurring: false,
      timestamp: new Date()
    };

    it('should validate een geldig event', () => {
      const result = NotificationCreatedEventValidator.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should verplichte velden valideren', () => {
      const requiredFields: Array<keyof NotificationCreatedEvent> = [
        'notificationId',
        'type',
        'scheduledFor',
        'channelId',
        'taskId',
        'isRecurring',
        'timestamp'
      ];

      for (const field of requiredFields) {
        const invalidEvent = { ...validEvent };
        delete invalidEvent[field];

        const result = NotificationCreatedEventValidator.safeParse(invalidEvent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });
  });

  describe('Type Validatie', () => {
    const baseEvent = {
      notificationId: 'notification123',
      scheduledFor: new Date(),
      channelId: 'channel123',
      taskId: 'task123',
      isRecurring: false,
      timestamp: new Date()
    };

    it('should geldige notification types accepteren', () => {
      const validTypes = ['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE'] as const;
      
      for (const type of validTypes) {
        const result = NotificationCreatedEventValidator.safeParse({
          ...baseEvent,
          type
        });
        expect(result.success).toBe(true);
      }
    });

    it('should ongeldige notification types afwijzen', () => {
      const result = NotificationCreatedEventValidator.safeParse({
        ...baseEvent,
        type: 'INVALID_TYPE'
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['type']);
      }
    });
  });

  describe('Optionele Velden', () => {
    const validEvent: NotificationCreatedEvent = {
      notificationId: 'notification123',
      type: 'REMINDER',
      scheduledFor: new Date(),
      channelId: 'channel123',
      taskId: 'task123',
      isRecurring: false,
      timestamp: new Date()
    };

    it('should optionele gebruiker targets accepteren', () => {
      const eventWithTargets = {
        ...validEvent,
        targetUserId: 'user123',
        targetRoleId: 'role123'
      };

      const result = NotificationCreatedEventValidator.safeParse(eventWithTargets);
      expect(result.success).toBe(true);
    });

    it('should optionele recurring configuratie accepteren', () => {
      const eventWithRecurring = {
        ...validEvent,
        isRecurring: true,
        recurrencePattern: '0 0 * * *',
        recurrenceEndDate: new Date()
      };

      const result = NotificationCreatedEventValidator.safeParse(eventWithRecurring);
      expect(result.success).toBe(true);
    });

    it('should custom message accepteren', () => {
      const eventWithMessage = {
        ...validEvent,
        customMessage: 'Test notification message'
      };

      const result = NotificationCreatedEventValidator.safeParse(eventWithMessage);
      expect(result.success).toBe(true);
    });
  });

  describe('Data Type Validatie', () => {
    const validEvent: NotificationCreatedEvent = {
      notificationId: 'notification123',
      type: 'REMINDER',
      scheduledFor: new Date(),
      channelId: 'channel123',
      taskId: 'task123',
      isRecurring: false,
      timestamp: new Date()
    };

    it('should datum velden valideren', () => {
      const dateFields: Array<keyof NotificationCreatedEvent> = [
        'scheduledFor',
        'recurrenceEndDate',
        'timestamp'
      ];
      const invalidDateValues = ['invalid-date', 123, {}, [], true, null];

      for (const field of dateFields) {
        if (field === 'recurrenceEndDate') continue; // Skip optional field

        for (const invalidValue of invalidDateValues) {
          const testEvent = {
            ...validEvent,
            [field]: invalidValue
          };

          const result = NotificationCreatedEventValidator.safeParse(testEvent);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].path).toEqual([field]);
          }
        }
      }
    });

    it('should string velden valideren', () => {
      const stringFieldTests = [
        { field: 'notificationId' as const, value: 123 },
        { field: 'channelId' as const, value: true },
        { field: 'taskId' as const, value: {} },
        { field: 'targetUserId' as const, value: [] },
        { field: 'targetRoleId' as const, value: 123 },
        { field: 'customMessage' as const, value: true }
      ];

      for (const { field, value } of stringFieldTests) {
        const testEvent = {
          ...validEvent,
          [field]: value
        };

        const result = NotificationCreatedEventValidator.safeParse(testEvent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });

    it('should boolean veld valideren', () => {
      const invalidBooleanValues = ['true', 1, 'yes', {}, [], null];

      for (const invalidValue of invalidBooleanValues) {
        const testEvent = {
          ...validEvent,
          isRecurring: invalidValue
        };

        const result = NotificationCreatedEventValidator.safeParse(testEvent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['isRecurring']);
        }
      }
    });
  });
});