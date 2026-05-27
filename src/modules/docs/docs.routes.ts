import type { FastifyInstance } from 'fastify';
import { buildOpenApiDocument } from '@/docs/openapi';

export function docsRoutes(app: FastifyInstance): void {
  const document = buildOpenApiDocument();
  app.get('/openapi.json', () => document);
}
