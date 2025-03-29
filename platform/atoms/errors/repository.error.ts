/**
 * Custom error class voor repository gerelateerde fouten
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
