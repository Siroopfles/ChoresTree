export class StatusTrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatusTrackingError';
  }
}