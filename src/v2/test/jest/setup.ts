import { initializeTestDatabase, initializeTestRedis } from '../../test/utils/db-test-utils';
import { runTestMigrations } from '../../test/utils/migrations/run-migrations';
import { TestSeeder } from '../../test/utils/seeders';
import './types';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DB_USER = 'postgres_test';
process.env.TEST_DB_PASSWORD = 'postgres_test';
process.env.TEST_DB_NAME = 'chorestree_test';

// Global setup before all tests
export default async function(): Promise<void> {
  try {
    console.warn('Initializing test environment...');

    // Initialize test database
    const dataSource = await initializeTestDatabase();
    
    // Run migrations
    await runTestMigrations(dataSource);
    
    // Initialize test Redis
    await initializeTestRedis();

    // Initialize seeder
    const seeder = new TestSeeder(dataSource);

    // Add to global scope for easy access in tests
    global.__TEST_DB__ = dataSource;
    global.__TEST_SEEDER__ = seeder;

    console.warn('Test environment initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test environment:', error);
    throw error;
  }
}