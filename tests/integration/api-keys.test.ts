import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { prisma } from '@/shared/db';

describe('API keys', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(resetDb);

  async function authHeader(): Promise<{ authorization: string }> {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'owner@example.com', password: 'SuperSecret123' },
    });
    return { authorization: `Bearer ${res.json<{ accessToken: string }>().accessToken}` };
  }

  it('creates a key, returns the raw value once, then authenticates with it', async () => {
    const headers = await authHeader();

    const created = await app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers,
      payload: { name: 'CI key', scopes: ['read'] },
    });
    expect(created.statusCode).toBe(201);
    const { key, prefix } = created.json<{ key: string; prefix: string }>();
    expect(key).toMatch(/^lf_live_/);
    expect(prefix).toBe(key.slice(0, 16));

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { 'x-api-key': key },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json<{ scopes: string[] }>().scopes).toEqual(['read']);
  });

  it('never exposes the key hash when listing', async () => {
    const headers = await authHeader();
    await app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers,
      payload: { name: 'k', scopes: ['read'] },
    });

    const list = await app.inject({ method: 'GET', url: '/v1/api-keys', headers });
    const body = list.json<Array<Record<string, unknown>>>();
    expect(body).toHaveLength(1);
    expect(body[0]).not.toHaveProperty('keyHash');
    expect(body[0]).not.toHaveProperty('key');
  });

  it('rejects a revoked key with 401', async () => {
    const headers = await authHeader();
    const created = await app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers,
      payload: { name: 'k', scopes: ['read'] },
    });
    const { id, key } = created.json<{ id: string; key: string }>();

    await app.inject({ method: 'DELETE', url: `/v1/api-keys/${id}`, headers });

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { 'x-api-key': key },
    });
    expect(me.statusCode).toBe(401);
  });
});
