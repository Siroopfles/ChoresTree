import { DataSource, QueryRunner } from 'typeorm';
import { Redis } from 'ioredis';

let testDataSource: DataSource | null = null;
let testRedisClient: Redis | null = null;

/**
 * Initialize test database connection
 */
export async function initializeTestDatabase() {
  if (!testDataSource) {
    testDataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: process.env.TEST_DB_USER || 'postgres_test',
      password: process.env.TEST_DB_PASSWORD || 'postgres_test',
      database: process.env.TEST_DB_NAME || 'chorestree_test',
      synchronize: true,
      dropSchema: true,
      entities: ['src/v2/**/entities/*.ts'],
      migrations: ['src/v2/migrations/*.ts'],
    });

    await testDataSource.initialize();
    await testDataSource.synchronize(true); // Force schema recreation
  }

  return testDataSource;
}

/**
 * Initialize test Redis connection
 */
export async function initializeTestRedis() {
  if (!testRedisClient) {
    testRedisClient = new Redis({
      host: 'localhost',
      port: 6380,
      maxRetriesPerRequest: 3,
    });
  }

  return testRedisClient;
}

/**
 * Cleanup test connections
 */
export async function cleanupTestConnections() {
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
    testDataSource = null;
  }

  if (testRedisClient) {
    await testRedisClient.quit();
    testRedisClient = null;
  }
}

/**
 * Transaction wrapper for tests
 */
export class TestTransaction {
  private queryRunner: QueryRunner;

  constructor(dataSource: DataSource) {
    this.queryRunner = dataSource.createQueryRunner();
  }

  async start() {
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async rollback() {
    await this.queryRunner.rollbackTransaction();
  }

  async release() {
    await this.queryRunner.release();
  }
}

/**
 * Run test in transaction and rollback after
 */
export async function runInTestTransaction<T>(
  dataSource: DataSource,
  testFn: () => Promise<T>
): Promise<T> {
  const transaction = new TestTransaction(dataSource);
  await transaction.start();

  try {
    const result = await testFn();
    return result;
  } finally {
    await transaction.rollback();
    await transaction.release();
  }
}

/**
 * Clear all Redis test data
 */
export async function clearTestRedis() {
  if (testRedisClient) {
    await testRedisClient.flushall();
  }
}