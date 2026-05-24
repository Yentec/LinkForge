import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { loggerOptions } from '@/config/logger';
import { registerErrorHandler } from '@/shared/errors/error-handler';
import { healthRoutes } from '@/modules/health/health.routes';

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

  return app;
}
