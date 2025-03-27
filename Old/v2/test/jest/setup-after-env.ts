import { DataSource } from 'typeorm';
import { clearTestRedis, runInTestTransaction } from '../utils/db-test-utils';
import customMatchers from './matchers/index';

// Helper functions for tests
export const getTestDb = (): DataSource => {
  if (!global.__TEST_DB__) {
    throw new Error('Test database not initialized');
  }
  return global.__TEST_DB__;
};

// Helper to run test in transaction
export const withTestTransaction = async (
  testFn: () => Promise<void>
): Promise<void> => {
  await runInTestTransaction(getTestDb(), testFn);
};

// Initialize custom matchers
// @ts-ignore
if (typeof expect !== 'undefined') {
  // @ts-ignore
  expect.extend(customMatchers);
}

// Initialize cleanup
// @ts-ignore
if (typeof afterEach !== 'undefined') {
  // @ts-ignore
  afterEach(async () => {
    await clearTestRedis();
  });
}