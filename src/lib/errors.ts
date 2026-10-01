/**
 * Typed application error with an HTTP status and a safe user-facing message.
 * Internal error details are logged server-side and never leaked to clients.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(message: string, status = 400, code = 'BAD_REQUEST', expose = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Please check your input and try again.') {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'You must be signed in to continue.') {
    super(message, 401, 'UNAUTHENTICATED');
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'This action conflicts with the current state.') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment processing failed. Please try again.') {
    super(message, 402, 'PAYMENT_ERROR');
    this.name = 'PaymentError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down and try again shortly.') {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Shape returned to the client by every API route. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function toErrorBody(err: unknown): { status: number; body: ApiErrorBody } {
  if (isAppError(err)) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.expose ? err.message : 'Something went wrong. Please try again.',
        },
      },
    };
  }
  console.error('[api] Unhandled error:', err);
  const raw = err instanceof Error ? err.message : '';
  // Configuration problems get an actionable, non-sensitive message (no secrets involved).
  if (/MONGODB_URI|AUTH_SECRET|RAZORPAY_|GOOGLE_|environment variable|README\.md/i.test(raw)) {
    return {
      status: 503,
      body: {
        error: {
          code: 'CONFIG_ERROR',
          message: raw,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our end. Please try again.',
      },
    },
  };
}
