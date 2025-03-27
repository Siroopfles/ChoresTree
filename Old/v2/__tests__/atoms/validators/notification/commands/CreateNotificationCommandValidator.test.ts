import { CreateNotificationCommandValidator, CreateNotificationCommand } from '../../../../../atomic/atoms/notification/validators/commands/CreateNotificationCommandValidator';

describe('CreateNotificationCommandValidator (Atoms)', () => {
  describe('Basis Validatie', () => {
    const validCommand = {
      type: 'REMINDER' as const,
      scheduledFor: new Date(),
      channelId: '123456',
      taskId: 'task123'
    };

    it('should validate een geldig command', () => {
      const result = CreateNotificationCommandValidator.safeParse(validCommand);
      expect(result.success).toBe(true);
    });

    it('should alle verplichte velden valideren', () => {
      // Test elke verplicht veld door een object te maken zonder dat veld
      const testCases: Array<{field: keyof CreateNotificationCommand, command: Partial<CreateNotificationCommand>}> = [
        {
          field: 'type',
          command: {
            scheduledFor: validCommand.scheduledFor,
            channelId: validCommand.channelId,
            taskId: validCommand.taskId
          }
        },
        {
          field: 'scheduledFor',
          command: {
            type: validCommand.type,
            channelId: validCommand.channelId,
            taskId: validCommand.taskId
          }
        },
        {
          field: 'channelId',
          command: {
            type: validCommand.type,
            scheduledFor: validCommand.scheduledFor,
            taskId: validCommand.taskId
          }
        },
        {
          field: 'taskId',
          command: {
            type: validCommand.type,
            scheduledFor: validCommand.scheduledFor,
            channelId: validCommand.channelId
          }
        }
      ];

      for (const { field, command } of testCases) {
        const result = CreateNotificationCommandValidator.safeParse(command);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });
  });

  describe('Type Validatie', () => {
    const baseCommand = {
      scheduledFor: new Date(),
      channelId: '123456',
      taskId: 'task123'
    };

    it('should geldige notification types accepteren', () => {
      const validTypes = ['REMINDER', 'DUE_DATE', 'ASSIGNMENT', 'STATUS_UPDATE'];
      
      for (const type of validTypes) {
        const result = CreateNotificationCommandValidator.safeParse({
          ...baseCommand,
          type
        });
        expect(result.success).toBe(true);
      }
    });

    it('should ongeldige notification types afwijzen', () => {
      const result = CreateNotificationCommandValidator.safeParse({
        ...baseCommand,
        type: 'INVALID_TYPE'
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['type']);
      }
    });
  });

  describe('Optionele Velden', () => {
    const validCommand = {
      type: 'REMINDER' as const,
      scheduledFor: new Date(),
      channelId: '123456',
      taskId: 'task123'
    };

    it('should optionele gebruiker targets accepteren', () => {
      const result = CreateNotificationCommandValidator.safeParse({
        ...validCommand,
        targetUserId: 'user123',
        targetRoleId: 'role123'
      });
      expect(result.success).toBe(true);
    });

    it('should recurring configuratie valideren', () => {
      const result = CreateNotificationCommandValidator.safeParse({
        ...validCommand,
        isRecurring: true,
        recurrencePattern: '0 0 * * *',
        recurrenceEndDate: new Date()
      });
      expect(result.success).toBe(true);
    });

    it('should custom message accepteren', () => {
      const result = CreateNotificationCommandValidator.safeParse({
        ...validCommand,
        customMessage: 'Test notification message'
      });
      expect(result.success).toBe(true);
    });

    it('should default waarde voor isRecurring valideren', () => {
      const result = CreateNotificationCommandValidator.safeParse(validCommand);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRecurring).toBe(false);
      }
    });
  });

  describe('Data Type Validatie', () => {
    const validCommand = {
      type: 'REMINDER' as const,
      scheduledFor: new Date(),
      channelId: '123456',
      taskId: 'task123'
    };

    it('should datum velden valideren', () => {
      const invalidDates = [
        'invalid-date',
        123,
        {},
        null,
        undefined
      ];

      for (const invalidDate of invalidDates) {
        const result = CreateNotificationCommandValidator.safeParse({
          ...validCommand,
          scheduledFor: invalidDate
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['scheduledFor']);
        }
      }
    });

    it('should string velden valideren', () => {
      // Test string velden met verschillende ongeldige waardes
      const stringFieldTests = [
        { field: 'channelId' as const, value: 123 },
        { field: 'taskId' as const, value: true },
        { field: 'targetUserId' as const, value: {} },
        { field: 'targetRoleId' as const, value: [] },
        { field: 'customMessage' as const, value: 42 }
      ];

      for (const { field, value } of stringFieldTests) {
        const testCommand = {
          ...validCommand,
          [field]: value
        };

        const result = CreateNotificationCommandValidator.safeParse(testCommand);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });
  });
});