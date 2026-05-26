import type { FastifyRequest } from 'fastify';

/** Reads and lightly validates the optional Idempotency-Key header. */
export function getIdempotencyKey(request: FastifyRequest): string | undefined {
  const value = request.headers['idempotency-key'];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 255 ? trimmed : undefined;
}
