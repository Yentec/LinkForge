import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { prisma } from '@/shared/db';

type AuthBody = { accessToken: string };
type LinkBody = { id: string; code: string; shortUrl: string };
type PageBody = { items: { id: string }[]; nextCursor: string | null };

describe('Links CRUD', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(resetDb);

  async function auth(): Promise<{ authorization: string }> {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'owner@example.com', password: 'SuperSecret123' },
    });
    const { accessToken } = res.json<AuthBody>();
    return { authorization: `Bearer ${accessToken}` };
  }

  it('creates a link with an auto-generated 7-char code', async () => {
    const headers = await auth();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/links',
      headers,
      payload: { target: 'https://example.com' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<LinkBody>();
    expect(body.code).toMatch(/^[a-zA-Z0-9]{7}$/);
    expect(body.shortUrl).toContain(body.code);
  });

  it('rejects a private/SSRF target with 400', async () => {
    const headers = await auth();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/links',
      headers,
      payload: { target: 'http://169.254.169.254/latest/meta-data' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a duplicate custom slug with 409', async () => {
    const headers = await auth();
    const payload = { target: 'https://example.com', customSlug: 'my-link' };
    await app.inject({ method: 'POST', url: '/v1/links', headers, payload });
    const res = await app.inject({ method: 'POST', url: '/v1/links', headers, payload });
    expect(res.statusCode).toBe(409);
  });

  it('returns the same link for a repeated idempotency key', async () => {
    const headers = { ...(await auth()), 'idempotency-key': 'key-123' };
    const payload = { target: 'https://example.com/page' };
    const first = await app.inject({ method: 'POST', url: '/v1/links', headers, payload });
    const second = await app.inject({ method: 'POST', url: '/v1/links', headers, payload });
    expect(first.json<LinkBody>().id).toBe(second.json<LinkBody>().id);
  });

  it('paginates with a cursor', async () => {
    const headers = await auth();
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/links',
        headers,
        payload: { target: `https://example.com/${i}` },
      });
    }
    const page1 = await app.inject({ method: 'GET', url: '/v1/links?limit=2', headers });
    const body1 = page1.json<PageBody>();
    expect(body1.items).toHaveLength(2);
    expect(body1.nextCursor).not.toBeNull();

    const page2 = await app.inject({
      method: 'GET',
      url: `/v1/links?limit=2&cursor=${body1.nextCursor}`,
      headers,
    });
    const body2 = page2.json<PageBody>();
    expect(body2.items).toHaveLength(1);
    expect(body2.nextCursor).toBeNull();
  });

  it('soft-deletes a link and hides it from the list', async () => {
    const headers = await auth();
    const created = await app.inject({
      method: 'POST',
      url: '/v1/links',
      headers,
      payload: { target: 'https://example.com' },
    });
    const { id } = created.json<LinkBody>();

    const del = await app.inject({ method: 'DELETE', url: `/v1/links/${id}`, headers });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/v1/links', headers });
    expect(list.json<PageBody>().items).toHaveLength(0);
  });

  it("forbids acting on another user's link with 404", async () => {
    const ownerHeaders = await auth();
    const created = await app.inject({
      method: 'POST',
      url: '/v1/links',
      headers: ownerHeaders,
      payload: { target: 'https://example.com' },
    });
    const { id } = created.json<LinkBody>();

    const otherRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'intruder@example.com', password: 'SuperSecret123' },
    });
    const intruderHeaders = { authorization: `Bearer ${otherRes.json<AuthBody>().accessToken}` };

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/links/${id}`,
      headers: intruderHeaders,
      payload: { target: 'https://evil.example.com' },
    });
    expect(res.statusCode).toBe(404);
  });
});
