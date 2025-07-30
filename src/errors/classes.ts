export class BaseError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = "Resource not found", code: string = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class InvalidInputError extends BaseError {
  constructor(message: string = "Invalid input", code: string = "INVALID_INPUT") {
    super(message, 400, code);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = "Forbidden", code: string = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = "Conflict", code: string = "CONFLICT") {
    super(message, 409, code);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = "Unauthorized", code: string = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}