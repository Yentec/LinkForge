import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import type { AppError } from './app-error';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function body(code: string, message: string, details?: unknown): ErrorBody {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: FastifyError | AppError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
      if ('name' in error && error.name === 'AppError') {
        const { statusCode, code, message, details } = error as AppError;
        return reply.status(statusCode).send(body(code, message, details));
      }

      if (error instanceof ZodError) {
        return reply
          .status(400)
          .send(body('VALIDATION_ERROR', 'Invalid request', z.flattenError(error).fieldErrors));
      }

      if ('validation' in error && error.validation) {
        return reply.status(400).send(body('VALIDATION_ERROR', error.message));
      }

      request.log.error({ err: error }, 'Unhandled error');
      return reply.status(500).send(body('INTERNAL_ERROR', 'An unexpected error occurred'));
    },
  );

  app.setNotFoundHandler((request, reply) => {
    return reply
      .status(404)
      .send(body('NOT_FOUND', `Route ${request.method} ${request.url} not found`));
  });
}
