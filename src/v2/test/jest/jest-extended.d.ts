declare global {
  namespace jest {
    interface Expect {
      toBeValidDatabase(): CustomMatcherResult;
    }

    interface Matchers<R> {
      toBeValidDatabase(): R;
    }
  }
}

export {};