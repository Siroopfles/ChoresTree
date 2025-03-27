import { DeleteNotificationCommandValidator, DeleteNotificationCommand } from '../../../../../atomic/atoms/notification/validators/commands/DeleteNotificationCommandValidator';

describe('DeleteNotificationCommandValidator (Atoms)', () => {
  describe('Basis Validatie', () => {
    const validCommand: DeleteNotificationCommand = {
      id: 'notification123',
      serverId: 'server123'
    };

    it('should validate een geldig command', () => {
      const result = DeleteNotificationCommandValidator.safeParse(validCommand);
      expect(result.success).toBe(true);
    });

    it('should verplichte velden valideren', () => {
      // Test ontbrekende id
      const missingId = {
        serverId: validCommand.serverId
      };
      const resultMissingId = DeleteNotificationCommandValidator.safeParse(missingId);
      expect(resultMissingId.success).toBe(false);
      if (!resultMissingId.success) {
        expect(resultMissingId.error.issues[0].path).toEqual(['id']);
      }

      // Test ontbrekende serverId
      const missingServerId = {
        id: validCommand.id
      };
      const resultMissingServerId = DeleteNotificationCommandValidator.safeParse(missingServerId);
      expect(resultMissingServerId.success).toBe(false);
      if (!resultMissingServerId.success) {
        expect(resultMissingServerId.error.issues[0].path).toEqual(['serverId']);
      }
    });
  });

  describe('Data Type Validatie', () => {
    it('should string velden valideren', () => {
      const testCases = [
        { field: 'id' as const, value: 123 },
        { field: 'id' as const, value: true },
        { field: 'id' as const, value: {} },
        { field: 'id' as const, value: [] },
        { field: 'serverId' as const, value: 123 },
        { field: 'serverId' as const, value: true },
        { field: 'serverId' as const, value: {} },
        { field: 'serverId' as const, value: [] }
      ];

      for (const { field, value } of testCases) {
        const testCommand = {
          id: 'notification123',
          serverId: 'server123',
          [field]: value
        };

        const result = DeleteNotificationCommandValidator.safeParse(testCommand);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([field]);
        }
      }
    });
  });

  describe('Lege en Ongeldige Waardes', () => {
    it('should lege strings afwijzen', () => {
      const emptyStrings = {
        id: '',
        serverId: ''
      };

      const result = DeleteNotificationCommandValidator.safeParse(emptyStrings);
      expect(result.success).toBe(false);
    });

    it('should null en undefined afwijzen', () => {
      const nullValues = {
        id: null,
        serverId: null
      };

      const undefinedValues = {
        id: undefined,
        serverId: undefined
      };

      const resultNull = DeleteNotificationCommandValidator.safeParse(nullValues);
      expect(resultNull.success).toBe(false);

      const resultUndefined = DeleteNotificationCommandValidator.safeParse(undefinedValues);
      expect(resultUndefined.success).toBe(false);
    });

    it('should whitespace strings afwijzen', () => {
      const whitespaceStrings = {
        id: '   ',
        serverId: '  '
      };

      const result = DeleteNotificationCommandValidator.safeParse(whitespaceStrings);
      expect(result.success).toBe(false);
    });
  });
});