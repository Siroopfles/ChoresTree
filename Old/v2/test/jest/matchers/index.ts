import { DataSource } from 'typeorm';

const customMatchers = {
  toBeValidDatabase(received: unknown) {
    const pass = received instanceof DataSource && received.isInitialized;
    const message = pass
      ? () => `Expected ${received} not to be an initialized DataSource instance`
      : () => `Expected ${received} to be an initialized DataSource instance`;

    return { pass, message };
  },
};

export default customMatchers;