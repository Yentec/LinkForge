export type AppError = Error & {
  readonly name: 'AppError';
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
};

type CreateAppErrorParams = {
  code: string;
  statusCode: number;
  message: string;
  details?: unknown;
};

export const createAppError = ({
  code,
  statusCode,
  message,
  details,
}: CreateAppErrorParams): AppError =>
  Object.assign(new Error(message), {
    name: 'AppError' as const,
    code,
    statusCode,
    details,
  });

export const Errors = {
  notFound: (resource: string): AppError =>
    createAppError({
      code: 'NOT_FOUND',
      statusCode: 404,
      message: `${resource} not found`,
    }),

  unauthorized: (message = 'Authentication required'): AppError =>
    createAppError({
      code: 'UNAUTHORIZED',
      statusCode: 401,
      message,
    }),

  forbidden: (message = 'Insufficient permissions'): AppError =>
    createAppError({
      code: 'FORBIDDEN',
      statusCode: 403,
      message,
    }),

  badRequest: (message: string, details?: unknown): AppError =>
    createAppError({
      code: 'BAD_REQUEST',
      statusCode: 400,
      message,
      details,
    }),

  conflict: (message: string): AppError =>
    createAppError({
      code: 'CONFLICT',
      statusCode: 409,
      message,
    }),

  rateLimited: (retryAfter: number): AppError =>
    createAppError({
      code: 'RATE_LIMITED',
      statusCode: 429,
      message: 'Too many requests',
      details: { retryAfter },
    }),
} as const;
