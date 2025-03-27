import { DataSource } from 'typeorm';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDatabase(): R;
    }
  }
}

export const databaseMatchers = {
  toBeValidDatabase(received: unknown): jest.CustomMatcherResult {
    const pass = received instanceof DataSource && received.isInitialized;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be an initialized DataSource instance`
          : `Expected ${received} to be an initialized DataSource instance`,
    };
  },
};