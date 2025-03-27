/// <reference types="jest" />

declare namespace jest {
  interface Expect {
    /**
     * Checks if the received value is a valid initialized DataSource
     */
    toBeValidDatabase(): CustomMatcherResult;
  }

  interface Matchers<R> {
    /**
     * Checks if the received value is a valid initialized DataSource
     */
    toBeValidDatabase(): R;
  }
}