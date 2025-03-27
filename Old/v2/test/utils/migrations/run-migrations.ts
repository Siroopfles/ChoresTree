import { DataSource } from 'typeorm';
import path from 'path';

/**
 * Run migrations for test database
 */
export async function runTestMigrations(dataSource: DataSource): Promise<void> {
  try {
    // Ensure database is initialized
    if (!dataSource.isInitialized) {
      throw new Error('Database connection not initialized');
    }

    // Get migration directory path
    const migrationsPath = path.join(process.cwd(), 'src/v2/core/database/migrations/versions');
    
    // Configure migrations
    dataSource.setOptions({
      migrations: [`${migrationsPath}/*.ts`]
    });
    
    // Run pending migrations
    console.warn('Running test database migrations...');
    await dataSource.runMigrations({
      transaction: 'each'
    });
    
    console.warn('Test migrations completed successfully');
  } catch (error) {
    console.error('Failed to run test migrations:', error);
    throw error;
  }
}

/**
 * Revert all migrations for test database
 */
export async function revertTestMigrations(dataSource: DataSource): Promise<void> {
  try {
    // Ensure database is initialized
    if (!dataSource.isInitialized) {
      throw new Error('Database connection not initialized');
    }

    // Get migration directory path
    const migrationsPath = path.join(process.cwd(), 'src/v2/core/database/migrations/versions');
    
    // Configure migrations
    dataSource.setOptions({
      migrations: [`${migrationsPath}/*.ts`]
    });

    // Revert all migrations
    console.warn('Reverting test database migrations...');
    await dataSource.undoLastMigration({
      transaction: 'each'
    });

    console.warn('Test migrations reverted successfully');
  } catch (error) {
    console.error('Failed to revert test migrations:', error);
    throw error;
  }
}