import { UpdateNotificationCommandValidator, UpdateNotificationCommand } from '../../../../../atomic/atoms/notification/validators/commands/UpdateNotificationCommandValidator';

describe('UpdateNotificationCommandValidator (Atoms)', () => {
  describe('Basis Validatie', () => {
    const validCommand = {
      id: 'notification123'
    };

    it('should validate een geldig command', () => {
      const result = UpdateNotificationCommandValidator.safeParse(validCommand);
      expect(result.success).toBe(true);
    });

    it('should id als verplicht veld valideren', () => {
      const invalidCommand = {};
      
      const result = UpdateNotificationCommandValidator.safeParse(invalidCommand);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['id']);
      }
    });
  });

  describe('Optionele Velden', () => {
    const validBaseCommand = {
      id: 'notification123'
    };

    it('should optionele basis velden accepteren', () => {
      const commandWithOptionals: UpdateNotificationCommand = {
        ...validBaseCommand,
        type: 'REMINDER',
        status: 'PENDING',
        scheduledFor: new Date(),
        channelId: 'channel123'
      };

      const result = UpdateNotificationCommandValidator.safeParse(commandWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should optionele gebruiker targets accepteren', () => {
      const commandWithTargets: UpdateNotificationCommand = {
        ...validBaseCommand,
        targetUserId: 'user123',
        targetRoleId: 'role123'
      };

      const result = UpdateNotificationCommandValidator.safeParse(commandWithTargets);
      expect(result.success).toBe(true);
    });

    it('should optionele recurring configuratie accepteren', () => {
      const commandWithRecurring: UpdateNotificationCommand = {
        ...validBaseCommand,
        isRecurring: true,
        recurrencePattern: '0 0 * * *',
        recurrenceEndDate: new Date()
      };

      const result = UpdateNotificationCommandValidator.safeParse(commandWithRecurring);
      expect(result.success).toBe(true);
    });
  });

  describe('Enum Validatie', () => {
    const validBaseCommand = {
      id: 'notification123'
    };

    it('should notification type enum valideren', () => {
      const validTypes = ['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE'] as const;
      const invalidType = 'INVALID_TYPE';

      // Test valid types
      for (const type of validTypes) {
        const result = UpdateNotificationCommandValidator.safeParse({
          ...validBaseCommand,
          type
        });
        expect(result.success).toBe(true);
      }

      // Test invalid type
      const result = UpdateNotificationCommandValidator.safeParse({
        ...validBaseCommand,
        type: invalidType
      });
      expect(result.success).toBe(false);
    });

    it('should notification status enum valideren', () => {
      const validStatuses = ['PENDING', 'SENT', 'FAILED', 'CANCELLED'] as const;
      const invalidStatus = 'INVALID_STATUS';

      // Test valid statuses
      for (const status of validStatuses) {
        const result = UpdateNotificationCommandValidator.safeParse({
          ...validBaseCommand,
          status
        });
        expect(result.success).toBe(true);
      }

      // Test invalid status
      const result = UpdateNotificationCommandValidator.safeParse({
        ...validBaseCommand,
        status: invalidStatus
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Data Type Validatie', () => {
    const validBaseCommand = {
      id: 'notification123'
    };

    it('should datum velden valideren', () => {
      const dateFields: Array<keyof UpdateNotificationCommand> = ['scheduledFor', 'recurrenceEndDate'];
      const invalidDateValues = ['invalid-date', 123, {}, [], true, null];

      for (const field of dateFields) {
        for (const invalidValue of invalidDateValues) {
          const testCommand = {
            ...validBaseCommand,
            [field]: invalidValue
          };

          const result = UpdateNotificationCommandValidator.safeParse(testCommand);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].path).toEqual([field]);
          }
        }
      }
    });

    it('should string velden valideren', () => {
      const stringFieldTests = [
        { field: 'channelId' as const, value: 123 },
        { field: 'targetUserId' as const, value: true },
        { field: 'targetRoleId' as const, value: {} },
        { field: 'customMessage' as const, value: [] }
      ];

      for (const { field, value } of stringFieldTests) {
        const testCommand = {
          ...validBaseCommand,
          [field]: value
        };

        const result = UpdateNotificationCommandValidator.safeParse(testCommand);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });

    it('should boolean veld valideren', () => {
      const invalidBooleanValues = ['true', 1, 'yes', {}, [], null];

      for (const invalidValue of invalidBooleanValues) {
        const testCommand = {
          ...validBaseCommand,
          isRecurring: invalidValue
        };

        const result = UpdateNotificationCommandValidator.safeParse(testCommand);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['isRecurring']);
        }
      }
    });
  });
});