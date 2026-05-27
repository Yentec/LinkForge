import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';

describe('Public redirect', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  async function createLink(payload: Record<string, unknown>): Promise<string> {
    const reg = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'owner@example.com', password: 'SuperSecret123' },
    });
    const headers = { authorization: `Bearer ${reg.json<{ accessToken: string }>().accessToken}` };
    const res = await app.inject({ method: 'POST', url: '/v1/links', headers, payload });
    return res.json<{ code: string }>().code;
  }

  it('redirects a known code with 302 and a location header', async () => {
    const code = await createLink({ target: 'https://example.com/landing' });
    const res = await app.inject({ method: 'GET', url: `/${code}` });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://example.com/landing');
  });

  it('returns 404 for an unknown code', async () => {
    const res = await app.inject({ method: 'GET', url: '/unknown' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 410 for an expired link', async () => {
    const code = await createLink({
      target: 'https://example.com',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await app.inject({ method: 'GET', url: `/${code}` });
    expect(res.statusCode).toBe(410);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('GONE');
  });

  it('does not let the catch-all shadow health or v1 routes', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    const me = await app.inject({ method: 'GET', url: '/v1/auth/me' });
    expect(me.statusCode).toBe(401); // route exists, just unauthenticated
  });
});
