import { Connection, EntityTarget } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EncryptedRepositoryImpl } from '../EncryptedRepositoryImpl';
import { BaseEntity } from '../../../../atoms/entities/base.entity';
import { ICacheProvider } from '../../../../core/cache/ICacheProvider';
import { RepositoryError } from '../../../../atoms/errors/repository.error';

// Test entity met encryptie velden
class TestEncryptedEntity extends BaseEntity {
  name: string;
  password: string;
  email: string;
}

describe('EncryptedRepositoryImpl', () => {
  let repository: EncryptedRepositoryImpl<TestEncryptedEntity>;
  let connection: Connection;
  let cacheManager: ICacheProvider;

  // Mock data
  const testEntity = {
    id: '123',
    name: 'Test User',
    password: 'secret123',
    email: 'test@example.com',
  } as TestEncryptedEntity;

  beforeEach(async () => {
    // Create mocks
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    connection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          connection: { getRepository: jest.fn().mockReturnValue(mockRepository) },
        },
      }),
    } as unknown as Connection;

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    repository = new EncryptedRepositoryImpl<TestEncryptedEntity>(
      connection,
      cacheManager,
      TestEncryptedEntity as EntityTarget<TestEncryptedEntity>,
    );
  });

  describe('encryptField/decryptField', () => {
    it('should mark fields for encryption/decryption', async () => {
      // Act
      await repository.encryptField('password');
      await repository.encryptField('email');

      // Assert
      const cacheKey = await repository['getCacheKey']('123');
      expect(cacheKey).toContain(':encrypted');
    });

    it('should remove fields from encryption list', async () => {
      // Arrange
      await repository.encryptField('password');

      // Act
      await repository.decryptField('password');

      // Assert
      const cacheKey = await repository['getCacheKey']('123');
      expect(cacheKey).not.toContain(':encrypted');
    });
  });

  describe('create with encryption', () => {
    it('should encrypt marked fields before saving', async () => {
      // Arrange
      await repository.encryptField('password');
      const mockRepo = connection.getRepository(TestEncryptedEntity);
      (mockRepo.create as jest.Mock).mockReturnValue(testEntity);
      (mockRepo.save as jest.Mock).mockResolvedValue(testEntity);

      // Act
      await repository.create({
        name: 'Test User',
        password: 'secret123',
        email: 'test@example.com',
      });

      // Assert
      const createCall = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(createCall.password).not.toBe('secret123');
      expect(createCall.email).toBe('test@example.com'); // niet geëncrypt
    });

    it('should handle encryption errors', async () => {
      // Arrange
      await repository.encryptField('password');
      const mockRepo = connection.getRepository(TestEncryptedEntity);
      (mockRepo.create as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption error');
      });

      // Act & Assert
      await expect(repository.create(testEntity)).rejects.toThrow(RepositoryError);
    });
  });

  describe('findById with decryption', () => {
    it('should decrypt marked fields after fetching', async () => {
      // Arrange
      await repository.encryptField('password');
      const encryptedPassword = Buffer.from('secret123').toString('base64');
      const mockRepo = connection.getRepository(TestEncryptedEntity);

      (mockRepo.findOne as jest.Mock).mockResolvedValue({
        ...testEntity,
        password: encryptedPassword,
      });

      // Act
      const result = await repository.findById('123');

      // Assert
      expect(result?.password).toBe('secret123');
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('findAll with decryption', () => {
    it('should decrypt marked fields for all entities', async () => {
      // Arrange
      await repository.encryptField('password');
      const mockQueryBuilder = connection.getRepository(TestEncryptedEntity).createQueryBuilder();

      const encryptedEntities = [
        { ...testEntity, password: Buffer.from('secret123').toString('base64') },
        { ...testEntity, id: '456', password: Buffer.from('password456').toString('base64') },
      ];

      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(encryptedEntities);

      // Act
      const results = await repository.findAll();

      // Assert
      expect(results[0].password).toBe('secret123');
      expect(results[1].password).toBe('password456');
      expect(results[0].email).toBe('test@example.com');
      expect(results[1].email).toBe('test@example.com');
    });
  });

  describe('update with encryption', () => {
    it('should encrypt marked fields before updating', async () => {
      // Arrange
      await repository.encryptField('password');
      const mockRepo = connection.getRepository(TestEncryptedEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(testEntity);
      (mockRepo.save as jest.Mock).mockImplementation((entity) => entity);

      // Act
      const result = await repository.update('123', {
        password: 'newpassword',
      });

      // Assert
      expect(result.password).not.toBe('newpassword');
      const decrypted = await repository['decrypt'](result.password);
      expect(decrypted).toBe('newpassword');
    });
  });

  describe('cache integration', () => {
    it('should use encrypted-specific cache keys', async () => {
      // Arrange
      await repository.encryptField('password');
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const mockRepo = connection.getRepository(TestEncryptedEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(testEntity);

      // Act
      await repository.findById('123');

      // Assert
      expect(cacheManager.get).toHaveBeenCalledWith('TestEncryptedEntity:123:encrypted');
    });
  });
});
