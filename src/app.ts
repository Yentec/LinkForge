import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { loggerOptions } from '@/config/logger';
import { registerErrorHandler } from '@/shared/errors/error-handler';
import { healthRoutes } from '@/modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { apiKeyRoutes } from './modules/api-keys/api-keys.routes';
import { linkRoutes } from './modules/links/links.routes';

/**
 * Builds a fully configured Fastify instance without starting the server.
 * Kept separate from server.ts so tests can instantiate the app in-memory.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions,
    genReqId: () => randomUUID(),
    trustProxy: true,
  });

  await app.register(helmet);
  await app.register(cors, { origin: true });

  registerErrorHandler(app);

  await app.register(healthRoutes);

  await app.register(
    (v1) => {
      v1.register(authRoutes);
      v1.register(apiKeyRoutes);
      v1.register(linkRoutes);
    },
    { prefix: '/v1' },
  );

  return app;
}
