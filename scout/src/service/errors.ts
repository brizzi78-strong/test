/** Error type the router maps to an HTTP status + friendly message. */
export class DomainError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
  }
}
