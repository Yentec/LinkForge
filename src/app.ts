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
import { redirectRoutes } from './modules/redirect/redirect.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { docsRoutes } from './modules/docs/docs.routes';
import { redis } from '@/shared/cache/redis';
import rateLimit from '@fastify/rate-limit';

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

  // CSP disabled: the only HTML we serve is the Scalar docs UI, which uses inline
  // scripts. A pure JSON API gains little from CSP; all other helmet headers stay on.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });

  // ... après await app.register(cors, ...) :
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    // Key by API key when present, else by IP.
    keyGenerator: (request) =>
      typeof request.headers['x-api-key'] === 'string' ? request.headers['x-api-key'] : request.ip,
    // Don't rate-limit health probes or the docs UI.
    allowList: (request) =>
      request.url.startsWith('/health') ||
      request.url.startsWith('/ready') ||
      request.url.startsWith('/docs') ||
      request.url === '/openapi.json',
  });

  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(docsRoutes);

  // Interactive API reference at /docs, reading the derived OpenAPI document.
  await app.register(import('@scalar/fastify-api-reference'), {
    routePrefix: '/docs',
    configuration: { url: '/openapi.json', title: 'LinkForge API' },
  });

  await app.register(
    (v1) => {
      v1.register(authRoutes);
      v1.register(apiKeyRoutes);
      v1.register(linkRoutes);
      v1.register(analyticsRoutes);
    },
    { prefix: '/v1' },
  );

  // Public redirect catch-all. Must be registered last.
  await app.register(redirectRoutes);

  return app;
}
