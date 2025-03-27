/// <reference types="jest" />

declare module '@jest/expect' {
  interface AsymmetricMatchers {
    toBeValidDatabase(): void;
  }
  interface Matchers<R> {
    toBeValidDatabase(): R;
  }
}

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if the received value is a valid initialized DataSource
       */
      toBeValidDatabase(): R;
    }
  }
}