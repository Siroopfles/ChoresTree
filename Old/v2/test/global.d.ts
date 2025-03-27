declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDatabase(): R;
    }
  }
}