import { getTestDb, withTestTransaction } from '@/v2/test/jest/setup-after-env';
import { BaseEntity } from '@/v2/core/database/base/BaseEntity';
import { BaseRepositoryImpl } from '@/v2/atomic/molecules/common/repositories/BaseRepositoryImpl';
import { DataSource, Entity, Column } from 'typeorm';
import { MemoryCacheProvider } from '@/v2/core/cache/providers/MemoryCacheProvider';

// Test entity
@Entity()
class TestEntity extends BaseEntity {
  @Column()
  name: string;
}

describe('BaseRepository (Molecules)', () => {
  let dataSource: DataSource;
  let repository: BaseRepositoryImpl<TestEntity>;
  let cacheProvider: MemoryCacheProvider;

  beforeAll(async () => {
    // Initialize test database
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();

    // Create test entity table
    await dataSource.synchronize(true);

    // Initialize repository with cache
    const typeormRepo = dataSource.getRepository(TestEntity);
    cacheProvider = new MemoryCacheProvider();
    repository = new BaseRepositoryImpl<TestEntity>(
      typeormRepo,
      'test_entity',
      TestEntity,
      cacheProvider
    );
  });

  describe('CRUD Operaties', () => {
    it('moet een nieuwe entity kunnen aanmaken en de cache invalideren', async () => {
      await withTestTransaction(async () => {
        // Arrange
        const testData = { name: 'Test Entity' };

        // Act
        const created = await repository.create(testData);

        // Assert
        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.name).toBe('Test Entity');

        // Verify cache was invalidated
        const cacheKey = `test_entity:${created.id}`;
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeNull();
      });
    });

    it('moet een entity kunnen ophalen met caching', async () => {
      await withTestTransaction(async () => {
        // Arrange
        const entity = await repository.create({ name: 'Cache Test' });
        const cacheKey = `test_entity:${entity.id}`;

        // Act
        const found = await repository.findById(entity.id);
        
        // Assert
        expect(found).toBeDefined();
        expect(found?.name).toBe('Cache Test');

        // Verify result was cached
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeDefined();
        expect(JSON.parse(cached as string).name).toBe('Cache Test');
      });
    });

    it('moet entities kunnen zoeken op criteria met caching', async () => {
      await withTestTransaction(async () => {
        // Arrange
        await repository.create({ name: 'Find Test 1' });
        await repository.create({ name: 'Find Test 2' });

        // Act
        const found = await repository.find({ name: 'Find Test 1' });

        // Assert
        expect(found).toHaveLength(1);
        expect(found[0].name).toBe('Find Test 1');

        // Verify results were cached
        const cacheKey = `test_entity:find:{"name":"Find Test 1"}`;
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeDefined();
      });
    });

    it('moet een entity kunnen updaten en de cache invalideren', async () => {
      await withTestTransaction(async () => {
        // Arrange
        const entity = await repository.create({ name: 'Update Test' });
        const cacheKey = `test_entity:${entity.id}`;

        // Cache initial state
        await repository.findById(entity.id);
        expect(await cacheProvider.get(cacheKey)).toBeDefined();

        // Act
        const updated = await repository.update(entity.id, { name: 'Updated' });

        // Assert
        expect(updated).toBeDefined();
        expect(updated?.name).toBe('Updated');

        // Verify cache was invalidated
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeNull();
      });
    });

    it('moet een entity soft kunnen verwijderen en de cache invalideren', async () => {
      await withTestTransaction(async () => {
        // Arrange
        const entity = await repository.create({ name: 'Delete Test' });
        const cacheKey = `test_entity:${entity.id}`;

        // Cache initial state
        await repository.findById(entity.id);
        expect(await cacheProvider.get(cacheKey)).toBeDefined();

        // Act
        const deleted = await repository.softDelete(entity.id);

        // Assert
        expect(deleted).toBe(true);
        
        // Verify entity is soft deleted
        const found = await repository.findById(entity.id);
        expect(found?.isDeleted()).toBe(true);
        expect(found?.deletedAt).toBeDefined();

        // Verify cache was invalidated
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeNull();
      });
    });

    it('moet een entity hard kunnen verwijderen en de cache invalideren', async () => {
      await withTestTransaction(async () => {
        // Arrange
        const entity = await repository.create({ name: 'Hard Delete Test' });
        const cacheKey = `test_entity:${entity.id}`;

        // Cache initial state
        await repository.findById(entity.id);
        expect(await cacheProvider.get(cacheKey)).toBeDefined();

        // Act
        const deleted = await repository.hardDelete(entity.id);

        // Assert
        expect(deleted).toBe(true);
        
        // Verify entity is completely removed
        const found = await repository.findById(entity.id);
        expect(found).toBeNull();

        // Verify cache was invalidated
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeNull();
      });
    });

    it('moet entities kunnen tellen met caching', async () => {
      await withTestTransaction(async () => {
        // Arrange
        await repository.create({ name: 'Count Test 1' });
        await repository.create({ name: 'Count Test 2' });

        // Act
        const count = await repository.count({});

        // Assert
        expect(count).toBe(2);

        // Verify count was cached
        const cacheKey = 'test_entity:count:{}';
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeDefined();
        expect(JSON.parse(cached as string)).toBe(2);
      });
    });

    it('moet de entity cache kunnen leegmaken', async () => {
      await withTestTransaction(async () => {
        // Arrange
        const entity = await repository.create({ name: 'Cache Clear Test' });
        await repository.findById(entity.id); // Cache the entity
        
        // Verify cache exists
        const cacheKey = `test_entity:${entity.id}`;
        expect(await cacheProvider.get(cacheKey)).toBeDefined();

        // Act
        await repository.clearEntityCache();

        // Assert
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('moet null teruggeven bij het zoeken van een niet-bestaande entity', async () => {
      await withTestTransaction(async () => {
        const result = await repository.findById('non-existent-id');
        expect(result).toBeNull();
      });
    });

    it('moet false teruggeven bij het verwijderen van een niet-bestaande entity', async () => {
      await withTestTransaction(async () => {
        const result = await repository.softDelete('non-existent-id');
        expect(result).toBe(false);
      });
    });

    it('moet null teruggeven bij het updaten van een niet-bestaande entity', async () => {
      await withTestTransaction(async () => {
        const result = await repository.update('non-existent-id', { name: 'New Name' });
        expect(result).toBeNull();
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    await dataSource.dropDatabase();
    await dataSource.destroy();
  });
});