import { DataSource } from 'typeorm';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDatabase(): R;
    }
  }
}

// Add custom matchers to Jest's global expect
if (expect && typeof expect.extend === 'function') {
  expect.extend({
    toBeValidDatabase(received: unknown) {
      const pass = received instanceof DataSource && received.isInitialized;
      return {
        pass,
        message: () =>
          pass
            ? `Expected ${received} not to be an initialized DataSource instance`
            : `Expected ${received} to be an initialized DataSource instance`,
      };
    },
  });
}

export {};