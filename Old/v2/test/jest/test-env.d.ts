/// <reference types="jest" />

declare global {
  const describe: jest.Describe;
  const beforeAll: jest.Lifecycle;
  const beforeEach: jest.Lifecycle;
  const afterAll: jest.Lifecycle;
  const afterEach: jest.Lifecycle;
  const test: jest.It;
  const it: jest.It;
  const jest: jest.Jest;

  namespace jest {
    interface Matchers<R> {
      toBeValidDatabase(): R;
    }
  }
}

export {};