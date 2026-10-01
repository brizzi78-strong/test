/** Domain error hierarchy; the router maps these to HTTP status codes. */

export class DomainError extends Error {
  readonly status: number = 422;
}

export class ValidationError extends DomainError {
  override readonly status = 400;
}

export class NotFoundError extends DomainError {
  override readonly status = 404;
}

export class ConflictError extends DomainError {
  override readonly status = 409;
}
