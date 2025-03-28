import { BaseEntity } from '../../../../atoms/entities/base.entity';
import { IBaseRepository } from '../IBaseRepository';
import { IEncryptedRepository } from '../IEncryptedRepository';
import { FindOptions } from '../types';

// Test entity voor validatie
class TestEntity extends BaseEntity {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

// Mock implementatie van IBaseRepository
class MockBaseRepository implements IBaseRepository<TestEntity> {
  async findById(id: string): Promise<TestEntity | null> {
    return new TestEntity('test');
  }

  async findAll(options?: FindOptions): Promise<TestEntity[]> {
    return [new TestEntity('test')];
  }

  async create(entity: Partial<TestEntity>): Promise<TestEntity> {
    return new TestEntity(entity.name || 'test');
  }

  async update(id: string, entity: Partial<TestEntity>): Promise<TestEntity> {
    return new TestEntity(entity.name || 'test');
  }

  async delete(id: string): Promise<void> {
    return;
  }

  async transaction<R>(operation: (repo: this) => Promise<R>): Promise<R> {
    return operation(this);
  }
}

// Mock implementatie van IEncryptedRepository
class MockEncryptedRepository
  extends MockBaseRepository
  implements IEncryptedRepository<TestEntity>
{
  async encryptField(field: keyof TestEntity): Promise<void> {
    return;
  }

  async decryptField(field: keyof TestEntity): Promise<void> {
    return;
  }
}

describe('Repository Interfaces', () => {
  describe('IBaseRepository', () => {
    let repository: IBaseRepository<TestEntity>;

    beforeEach(() => {
      repository = new MockBaseRepository();
    });

    it('implementeert alle required methods', () => {
      expect(repository.findById).toBeDefined();
      expect(repository.findAll).toBeDefined();
      expect(repository.create).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.delete).toBeDefined();
      expect(repository.transaction).toBeDefined();
    });

    it('findById returnt een Promise<TestEntity | null>', async () => {
      const result = await repository.findById('test-id');
      expect(result).toBeInstanceOf(TestEntity);
    });

    it('findAll accepteert FindOptions parameter', async () => {
      const options: FindOptions = {
        limit: 10,
        offset: 0,
        orderBy: { name: 'ASC' },
        where: { name: 'test' },
      };
      const result = await repository.findAll(options);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('IEncryptedRepository', () => {
    let repository: IEncryptedRepository<TestEntity>;

    beforeEach(() => {
      repository = new MockEncryptedRepository();
    });

    it('implementeert alle base repository methods', () => {
      expect(repository.findById).toBeDefined();
      expect(repository.findAll).toBeDefined();
      expect(repository.create).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.delete).toBeDefined();
      expect(repository.transaction).toBeDefined();
    });

    it('implementeert encryptie methods', () => {
      expect(repository.encryptField).toBeDefined();
      expect(repository.decryptField).toBeDefined();
    });

    it('encryptField accepteert alleen valid entity keys', async () => {
      await expect(repository.encryptField('name')).resolves.not.toThrow();
      // @ts-expect-error - Test voor type safety
      await expect(repository.encryptField('invalidField')).rejects.toThrow();
    });
  });
});
