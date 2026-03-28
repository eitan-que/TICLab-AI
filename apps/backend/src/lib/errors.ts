import { ZodError } from "zod";

/**
 * Custom application error class that extends the built-in Error class.
 * Includes an error code, HTTP status code, and optional additional details.
 * 
 * @param message - A human-readable error message.
 * @param code - A machine-readable error code for programmatic handling and error translation.
 * @param statusCode - The HTTP status code to return (default is 500).
 * @param details - Optional additional details about the error.
 * 
 * @example
 * ```ts
 * throw new AppError("User not found", "USER_NOT_FOUND", 404);
 * ```
 */
export class AppError<T = undefined> extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: T
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * NotFoundError represents a 404 Not Found error.
 * Used when a requested resource cannot be found.
 */
export class NotFoundError<T> extends AppError<T> {
  constructor(
    message: string = "Resource not found", 
    details: T
  ) {
    super(message, "NOT_FOUND", 404, details);
    this.name = "NotFoundError";
  }
}

/**
 * ValidationError represents a 400 Bad Request error due to validation failures.
 * The details property contains specific validation error information, such as which fields failed validation and why.
 * This allows clients to understand exactly what was wrong with the request data.
 */
export class ValidationError<T> extends AppError<T> {
  constructor(
    message: string = "Validation failed",
    details: T
  ) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * BadRequestError represents a 400 Bad Request error.
 * Used when the client sends invalid data or parameters.
 */
export class BadRequestError<T> extends AppError<T> {
  constructor(
    message: string = "Bad request",
    details: T
  ) {
    super(message, "BAD_REQUEST", 400, details);
    this.name = "BadRequestError";
  }
}

/**
 * UnauthorizedError represents a 401 Unauthorized error.
 * Used when a client attempts to access a resource without proper authentication.
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = "Unauthorized",
  ) {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * ForbiddenError represents a 403 Forbidden error.
 * Used when a client is authenticated but does not have permission to access the requested resource.
 */
export class ForbiddenError<T> extends AppError<T> {
  constructor(
    message: string = "Forbidden",
    details: T
  ) {
    super(message, "FORBIDDEN", 403, details);
    this.name = "ForbiddenError";
  }
}

/**
 * ConflictError represents a 409 Conflict error.
 * Used when a request conflicts with the current state of the resource.
 */
export class ConflictError<T> extends AppError<T> {
  constructor(
    message: string = "Conflict",
    details: T
  ) {
    super(message, "CONFLICT", 409, details);
    this.name = "ConflictError";
  }
}

/**
 * ParseZodError is a helper function that converts a ZodError into a ValidationError with a structured details object.
 * It maps Zod's validation issues to a more standardized format that can be easily consumed by clients.
 * Each issue is transformed into an object that indicates the path of the invalid field and the expected type, or lists any unrecognized keys.
 * This allows clients to understand exactly what was wrong with the request data and how to fix it.
 * @param error - The ZodError thrown during validation.
 * @returns A ValidationError with a structured details object containing the validation issues.
 */
export function ParseZodError(error: ZodError): ValidationError<({ path: string; expected: unknown }|{ extraKeys: string[] })[]> {
  const parsedError = error.issues.map(issue => {
    if (issue.code === 'unrecognized_keys') {
      return { extraKeys: issue.keys };
    }
    return {
      path: issue.path.join(':'),
      expected: issue.code === 'invalid_type' ? issue.expected : undefined,
    };
  });
  return new ValidationError("Validation failed", parsedError);
}