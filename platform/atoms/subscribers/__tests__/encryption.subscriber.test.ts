import { EncryptionSubscriber } from '../encryption.subscriber';
import { IEncryptionProvider } from '../../interfaces/encryption.interface';
import { TaskEntity } from '../../entities/task.entity';
import { Connection, EntityMetadata, QueryRunner, EntityManager } from 'typeorm';
import 'reflect-metadata';

describe('EncryptionSubscriber', () => {
  let subscriber: EncryptionSubscriber;
  let mockEncryptionProvider: jest.Mocked<IEncryptionProvider>;
  let mockConnection: Partial<Connection>;
  let mockMetadata: Partial<EntityMetadata>;
  let mockQueryRunner: Partial<QueryRunner>;
  let mockManager: Partial<EntityManager>;

  beforeEach(() => {
    mockEncryptionProvider = {
      encrypt: jest.fn().mockImplementation((value) => ({
        content: `encrypted_${value}`,
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      })),
      decrypt: jest
        .fn()
        .mockImplementation((encrypted) => encrypted.content.replace('encrypted_', '')),
      generateKey: jest.fn(),
    };

    mockManager = {
      query: jest.fn(),
    };

    mockConnection = {
      name: 'default',
      manager: mockManager as EntityManager,
    };

    mockMetadata = {
      name: 'TaskEntity',
      target: TaskEntity,
    };

    mockQueryRunner = {
      manager: mockManager as EntityManager,
    };

    subscriber = new EncryptionSubscriber(mockEncryptionProvider);
  });

  describe('beforeInsert', () => {
    it('should encrypt marked fields before insert', async () => {
      const task = new TaskEntity();
      task.title = 'Test Task';
      task.description = 'Test Description';

      // Er wordt nu een IEncryptionResult geretourneerd dat naar JSON wordt omgezet
      const mockTitleResult = {
        content: 'encrypted_Test Task',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      };

      const mockDescriptionResult = {
        content: 'encrypted_Test Description',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      };

      mockEncryptionProvider.encrypt
        .mockResolvedValueOnce(mockTitleResult)
        .mockResolvedValueOnce(mockDescriptionResult);

      await subscriber.beforeInsert({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata,
      });

      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledWith('Test Task');
      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledWith('Test Description');

      // De waarden zijn nu JSON strings van IEncryptionResult
      const expectedTitleJson = JSON.stringify(mockTitleResult);
      const expectedDescriptionJson = JSON.stringify(mockDescriptionResult);

      expect(task.title).toBe(expectedTitleJson);
      expect(task.description).toBe(expectedDescriptionJson);
    });

    it('should not encrypt non-marked fields', async () => {
      const task = new TaskEntity();
      task.title = 'Test Task';
      task.assigneeId = 'user-123';

      mockEncryptionProvider.encrypt.mockResolvedValueOnce({
        content: 'encrypted_Test Task',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      });

      await subscriber.beforeInsert({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata,
      });

      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledTimes(1);
      expect(task.assigneeId).toBe('user-123');
    });
  });

  describe('afterLoad', () => {
    it('should decrypt marked fields after load', async () => {
      const task = new TaskEntity();
      task.title = 'encrypted_title';
      task.description = 'encrypted_description';

      const mockEncryptedTitle = {
        content: 'encrypted_Test Task',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      };

      const mockEncryptedDescription = {
        content: 'encrypted_Test Description',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      };

      mockEncryptionProvider.decrypt
        .mockResolvedValueOnce('Test Task')
        .mockResolvedValueOnce('Test Description');

      // We zetten de encrypted waarden als JSON strings
      task.title = JSON.stringify(mockEncryptedTitle);
      task.description = JSON.stringify(mockEncryptedDescription);

      await subscriber.afterLoad({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata,
      });

      expect(mockEncryptionProvider.decrypt).toHaveBeenCalledWith(mockEncryptedTitle);
      expect(mockEncryptionProvider.decrypt).toHaveBeenCalledWith(mockEncryptedDescription);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
    });

    it('should handle undefined values', async () => {
      const task = new TaskEntity();
      task.title = 'encrypted_title';
      // description is undefined

      const mockEncryptedTitle = {
        content: 'encrypted_Test Task',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      };

      mockEncryptionProvider.decrypt.mockResolvedValueOnce('Test Task');
      task.title = JSON.stringify(mockEncryptedTitle);

      await subscriber.afterLoad({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata,
      });

      expect(mockEncryptionProvider.decrypt).toHaveBeenCalledTimes(1);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBeUndefined();
    });
  });

  describe('beforeUpdate', () => {
    it('should encrypt only changed marked fields', async () => {
      const task = new TaskEntity();
      task.title = 'New Title';
      task.description = JSON.stringify({
        content: 'encrypted_Old Description',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      }); // Simulating unchanged encrypted value

      const mockNewTitleResult = {
        content: 'encrypted_New Title',
        iv: 'test-iv',
        tag: 'test-tag',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
      };

      mockEncryptionProvider.encrypt.mockResolvedValueOnce(mockNewTitleResult);

      await subscriber.beforeUpdate({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata,
        databaseEntity: new TaskEntity(),
        updatedColumns: [],
        updatedRelations: [],
      });

      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledTimes(1);
      expect(task.title).toBe(JSON.stringify(mockNewTitleResult));
      expect(task.description).toBe(
        JSON.stringify({
          content: 'encrypted_Old Description',
          iv: 'test-iv',
          tag: 'test-tag',
          keyId: 'test-key',
          algorithm: 'aes-256-gcm',
        }),
      );
    });
  });
});
