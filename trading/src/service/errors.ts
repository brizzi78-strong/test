/**
 * Domain errors. Each carries an HTTP status so the API layer can translate
 * failures without knowing what went wrong.
 */

export class DomainError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends DomainError {
  constructor(what: string, id: string) {
    super('not_found', `${what} not found: ${id}`, 404);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('validation', message, 400);
  }
}

/** An operation that is not legal for the entity's current state. */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super('conflict', message, 409);
  }
}
