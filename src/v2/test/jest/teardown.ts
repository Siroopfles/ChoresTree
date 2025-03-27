import { cleanupTestConnections } from '@/v2/utils/test/db-test-utils';
import './types';

// Global teardown after all tests
export default async function(): Promise<void> {
  try {
    // Cleanup database and Redis connections
    await cleanupTestConnections();
    
    // Remove from global scope
    delete global.__TEST_DB__;
  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
    throw error;
  }
}