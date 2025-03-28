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
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn()
    };

    mockManager = {
      query: jest.fn()
    };

    mockConnection = {
      name: 'default',
      manager: mockManager as EntityManager
    };

    mockMetadata = {
      name: 'TaskEntity',
      target: TaskEntity
    };

    mockQueryRunner = {
      manager: mockManager as EntityManager
    };

    subscriber = new EncryptionSubscriber(mockEncryptionProvider);
  });

  describe('beforeInsert', () => {
    it('should encrypt marked fields before insert', async () => {
      const task = new TaskEntity();
      task.title = 'Test Task';
      task.description = 'Test Description';

      mockEncryptionProvider.encrypt
        .mockResolvedValueOnce('encrypted_title')
        .mockResolvedValueOnce('encrypted_description');

      await subscriber.beforeInsert({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata
      });

      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledWith('Test Task', undefined);
      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledWith('Test Description', undefined);
      expect(task.title).toBe('encrypted_title');
      expect(task.description).toBe('encrypted_description');
    });

    it('should not encrypt non-marked fields', async () => {
      const task = new TaskEntity();
      task.title = 'Test Task';
      task.assigneeId = 'user-123';

      mockEncryptionProvider.encrypt
        .mockResolvedValueOnce('encrypted_title');

      await subscriber.beforeInsert({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata
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

      mockEncryptionProvider.decrypt
        .mockResolvedValueOnce('Test Task')
        .mockResolvedValueOnce('Test Description');

      await subscriber.afterLoad({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata
      });

      expect(mockEncryptionProvider.decrypt).toHaveBeenCalledWith('encrypted_title', undefined);
      expect(mockEncryptionProvider.decrypt).toHaveBeenCalledWith('encrypted_description', undefined);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
    });

    it('should handle undefined values', async () => {
      const task = new TaskEntity();
      task.title = 'encrypted_title';
      // description is undefined

      mockEncryptionProvider.decrypt
        .mockResolvedValueOnce('Test Task');

      await subscriber.afterLoad({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata
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
      task.description = 'encrypted_description'; // Simulating unchanged encrypted value

      mockEncryptionProvider.encrypt
        .mockResolvedValueOnce('encrypted_new_title');

      await subscriber.beforeUpdate({
        entity: task,
        connection: mockConnection as Connection,
        queryRunner: mockQueryRunner as QueryRunner,
        manager: mockManager as EntityManager,
        metadata: mockMetadata as EntityMetadata,
        databaseEntity: new TaskEntity(),
        updatedColumns: [],
        updatedRelations: []
      });

      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledTimes(1);
      expect(task.title).toBe('encrypted_new_title');
      expect(task.description).toBe('encrypted_description');
    });
  });
});