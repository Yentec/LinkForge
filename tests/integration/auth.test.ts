import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { prisma } from '@/shared/db';

const credentials = { email: 'user@example.com', password: 'SuperSecret123' };

describe('Auth flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(resetDb);

  const register = () =>
    app.inject({ method: 'POST', url: '/v1/auth/register', payload: credentials });

  it('registers a new user and returns a token pair', async () => {
    const res = await register();
    expect(res.statusCode).toBe(201);
    const body = res.json<{ tokenType: string; expiresIn: number; accessToken: string; refreshToken: string }>();
    expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('rejects duplicate registration with 409', async () => {
    await register();
    const res = await register();
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('CONFLICT');
  });

  it('rejects login with a wrong password (no enumeration)', async () => {
    await register();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { ...credentials, password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rotates the refresh token: the old one becomes invalid', async () => {
    const { refreshToken } = (await register()).json<{ refreshToken: string }>();

    const refreshed = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);

    const reused = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(reused.statusCode).toBe(401);
  });

  it('protects /auth/me and accepts a Bearer token', async () => {
    const { accessToken } = (await register()).json<{ accessToken: string }>();

    const unauthorized = await app.inject({ method: 'GET', url: '/v1/auth/me' });
    expect(unauthorized.statusCode).toBe(401);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ scopes: string[] }>().scopes).toEqual(['read', 'write']);
  });
});
