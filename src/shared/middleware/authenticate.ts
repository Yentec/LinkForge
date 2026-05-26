import type { FastifyReply, FastifyRequest } from 'fastify';
import { Errors } from '@/shared/errors/app-error';
import { verifyAccessToken } from '@/shared/auth/jwt';
import { sha256 } from '@/shared/auth/tokens';
import { prisma } from '@/shared/db';

export interface AuthContext {
  userId: string;
  scopes: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

/**
 * Authenticates via X-API-Key (machine clients) or Bearer JWT (interactive clients).
 * Populates request.auth. Throws 401 when neither credential is valid.
 */
export async function authenticate(request: FastifyRequest): Promise<void> {
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.length > 0) {
    const record = await prisma.apiKey.findUnique({ where: { keyHash: sha256(apiKey) } });
    if (!record || record.revokedAt) throw Errors.unauthorized('Invalid API key');

    // Fire-and-forget: last-used tracking must never block or fail the request.
    void prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    request.auth = { userId: record.userId, scopes: record.scopes };
    return;
  }

  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const { userId } = await verifyAccessToken(header.slice(7));
      request.auth = { userId, scopes: ['read', 'write'] };
      return;
    } catch {
      throw Errors.unauthorized('Invalid or expired token');
    }
  }

  throw Errors.unauthorized();
}

export function getAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) throw Errors.unauthorized();
  return request.auth;
}

export function requireScope(scope: string) {
  return (request: FastifyRequest, _reply: FastifyReply, done: (err?: Error) => void): void => {
    const auth = getAuth(request);
    if (!auth.scopes.includes(scope)) {
      done(Errors.forbidden(`Missing scope: ${scope}`));
      return;
    }
    done();
  };
}
