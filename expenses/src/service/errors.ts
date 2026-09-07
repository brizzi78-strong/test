/** Error carrying an HTTP status, thrown by the service and mapped by the router. */
export class DomainError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
  }
}

export const notFound = (what: string): DomainError => new DomainError(`${what} not found`, 404);
export const forbidden = (message: string): DomainError => new DomainError(message, 403);
export const conflict = (message: string): DomainError => new DomainError(message, 409);
