import { DataSource } from 'typeorm';

declare const expect: jest.Expect;

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
