import { z } from 'zod';
import { registerSchema, refreshSchema } from '@/modules/auth/auth.schemas';
import { createApiKeySchema } from '@/modules/api-keys/api-keys.schemas';
import { createLinkSchema, updateLinkSchema } from '@/modules/links/links.schemas';
import { statsQuerySchema } from '@/modules/analytics/analytics.schemas';

// Single source of truth: request shapes come straight from the Zod schemas.
const toJson = (schema: z.ZodType): Record<string, unknown> =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', unrepresentable: 'any' });

const json = { 'application/json': { schema: { type: 'object' } } } as const;
const bodyOf = (schema: z.ZodType) => ({
  required: true,
  content: { 'application/json': { schema: toJson(schema) } },
});

const errorResponse = {
  description: 'Error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: { code: { type: 'string' }, message: { type: 'string' } },
          },
        },
      },
    },
  },
} as const;

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'LinkForge API',
      version: '1.0.0',
      description:
        'URL shortener API with authentication, API keys, anonymized async click tracking and analytics.',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    paths: {
      '/v1/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: bodyOf(registerSchema),
          responses: { 201: { description: 'Token pair', content: json }, 409: errorResponse },
        },
      },
      '/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Log in',
          security: [],
          requestBody: bodyOf(registerSchema),
          responses: { 200: { description: 'Token pair', content: json }, 401: errorResponse },
        },
      },
      '/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Rotate the refresh token',
          security: [],
          requestBody: bodyOf(refreshSchema),
          responses: { 200: { description: 'New token pair', content: json }, 401: errorResponse },
        },
      },
      '/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Revoke a refresh token',
          security: [],
          requestBody: bodyOf(refreshSchema),
          responses: { 204: { description: 'Logged out' } },
        },
      },
      '/v1/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Current identity',
          responses: { 200: { description: 'Identity', content: json }, 401: errorResponse },
        },
      },
      '/v1/api-keys': {
        post: {
          tags: ['API Keys'],
          summary: 'Create an API key (raw value returned once)',
          requestBody: bodyOf(createApiKeySchema),
          responses: { 201: { description: 'Created key', content: json } },
        },
        get: {
          tags: ['API Keys'],
          summary: 'List API keys',
          responses: { 200: { description: 'Keys', content: json } },
        },
      },
      '/v1/api-keys/{id}': {
        delete: {
          tags: ['API Keys'],
          summary: 'Revoke an API key',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: 'Revoked' }, 404: errorResponse },
        },
      },
      '/v1/links': {
        post: {
          tags: ['Links'],
          summary: 'Create a short link',
          parameters: [
            {
              name: 'Idempotency-Key',
              in: 'header',
              required: false,
              schema: { type: 'string' },
            },
          ],
          requestBody: bodyOf(createLinkSchema),
          responses: {
            201: { description: 'Created link', content: json },
            400: errorResponse,
            409: errorResponse,
          },
        },
        get: {
          tags: ['Links'],
          summary: 'List links (cursor paginated)',
          parameters: [
            { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: { 200: { description: 'Page of links', content: json } },
        },
      },
      '/v1/links/{id}': {
        patch: {
          tags: ['Links'],
          summary: 'Update a link',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: bodyOf(updateLinkSchema),
          responses: { 200: { description: 'Updated link', content: json }, 404: errorResponse },
        },
        delete: {
          tags: ['Links'],
          summary: 'Soft-delete a link',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: 'Deleted' }, 404: errorResponse },
        },
      },
      '/v1/links/{id}/stats': {
        get: {
          tags: ['Analytics'],
          summary: 'Click analytics for a link',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ...Object.entries(
              (toJson(statsQuerySchema)['properties'] as Record<string, unknown>) ?? {},
            ).map(([name, schema]) => ({ name, in: 'query', required: false, schema })),
          ],
          responses: { 200: { description: 'Stats', content: json }, 404: errorResponse },
        },
      },
      '/{code}': {
        get: {
          tags: ['Redirect'],
          summary: 'Public redirect to the target URL',
          security: [],
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            302: { description: 'Redirect' },
            404: errorResponse,
            410: errorResponse,
          },
        },
      },
    },
  };
}
