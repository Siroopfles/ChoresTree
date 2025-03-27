import { NotificationDeletedEventValidator, NotificationDeletedEvent } from '../../../../../atomic/atoms/notification/validators/events/NotificationDeletedEventValidator';

describe('NotificationDeletedEventValidator (Atoms)', () => {
  describe('Basis Validatie', () => {
    const validEvent: NotificationDeletedEvent = {
      notificationId: 'notification123',
      serverId: 'server123',
      timestamp: new Date()
    };

    it('should validate een geldig event', () => {
      const result = NotificationDeletedEventValidator.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should verplichte velden valideren', () => {
      const requiredFields: Array<keyof NotificationDeletedEvent> = [
        'notificationId',
        'serverId',
        'timestamp'
      ];

      for (const field of requiredFields) {
        const invalidEvent = { ...validEvent };
        delete invalidEvent[field];

        const result = NotificationDeletedEventValidator.safeParse(invalidEvent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });
  });

  describe('Data Type Validatie', () => {
    it('should string velden valideren', () => {
      const stringFieldTests = [
        { field: 'notificationId' as const, value: 123 },
        { field: 'notificationId' as const, value: true },
        { field: 'notificationId' as const, value: {} },
        { field: 'notificationId' as const, value: [] },
        { field: 'serverId' as const, value: 123 },
        { field: 'serverId' as const, value: true },
        { field: 'serverId' as const, value: {} },
        { field: 'serverId' as const, value: [] }
      ];

      for (const { field, value } of stringFieldTests) {
        const testEvent = {
          notificationId: 'notification123',
          serverId: 'server123',
          timestamp: new Date(),
          [field]: value
        };

        const result = NotificationDeletedEventValidator.safeParse(testEvent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });

    it('should timestamp valideren', () => {
      const invalidDateValues = [
        'invalid-date',
        123,
        true,
        {},
        [],
        null,
        undefined
      ];

      for (const invalidValue of invalidDateValues) {
        const testEvent = {
          notificationId: 'notification123',
          serverId: 'server123',
          timestamp: invalidValue
        };

        const result = NotificationDeletedEventValidator.safeParse(testEvent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['timestamp']);
        }
      }
    });
  });

  describe('String Formaat Validatie', () => {
    it('should lege strings afwijzen', () => {
      const emptyStringEvent = {
        notificationId: '',
        serverId: '',
        timestamp: new Date()
      };

      const result = NotificationDeletedEventValidator.safeParse(emptyStringEvent);
      expect(result.success).toBe(false);
    });

    it('should whitespace strings afwijzen', () => {
      const whitespaceStringEvent = {
        notificationId: '   ',
        serverId: '  ',
        timestamp: new Date()
      };

      const result = NotificationDeletedEventValidator.safeParse(whitespaceStringEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('Extra Velden', () => {
    it('should extra velden negeren', () => {
      const eventWithExtra = {
        notificationId: 'notification123',
        serverId: 'server123',
        timestamp: new Date(),
        extraField: 'should be ignored'
      };

      const result = NotificationDeletedEventValidator.safeParse(eventWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        // @ts-ignore
        expect(result.data.extraField).toBeUndefined();
      }
    });
  });
});