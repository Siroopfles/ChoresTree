/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if the received value is a valid initialized DataSource instance
       * @returns {R extends void ? boolean : R} true if the value is a valid DataSource
       */
      toBeValidDatabase(): R extends void ? boolean : R;
    }
  }
}

export {};