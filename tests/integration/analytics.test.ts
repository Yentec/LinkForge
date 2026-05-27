import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';

describe('Analytics', () => {
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

  async function setup(): Promise<{ headers: { authorization: string }; linkId: string }> {
    const reg = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'owner@example.com', password: 'SuperSecret123' },
    });
    const headers = { authorization: `Bearer ${reg.json<{ accessToken: string }>().accessToken}` };
    const created = await app.inject({
      method: 'POST',
      url: '/v1/links',
      headers,
      payload: { target: 'https://example.com' },
    });
    return { headers, linkId: created.json<{ id: string }>().id };
  }

  async function seedClicks(linkId: string): Promise<void> {
    const base = (overrides: Record<string, unknown>) => ({
      linkId,
      deviceType: 'desktop',
      ipHash: 'abc0123456789def',
      country: null,
      browser: null,
      referrerHost: null,
      ...overrides,
    });
    await prisma.click.createMany({
      data: [
        base({ country: 'FR', browser: 'Chrome', createdAt: new Date('2026-01-01T10:00:00Z') }),
        base({ country: 'FR', browser: 'Firefox', createdAt: new Date('2026-01-01T12:00:00Z') }),
        base({ country: 'US', browser: 'Chrome', createdAt: new Date('2026-01-02T09:00:00Z') }),
        base({ country: 'FR', deviceType: 'mobile', createdAt: new Date('2026-01-02T11:00:00Z') }),
      ],
    });
  }

  it('returns aggregated stats with totals, series and top dimensions', async () => {
    const { headers, linkId } = await setup();
    await seedClicks(linkId);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/links/${linkId}/stats?from=2025-12-01T00:00:00Z&to=2026-02-01T00:00:00Z&interval=day`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    type StatsBody = {
      totalClicks: number;
      timeseries: Array<{ count: number }>;
      topCountries: Array<{ key: string; count: number }>;
      topBrowsers: Array<{ key: string; count: number }>;
      topDevices: Array<{ key: string; count: number }>;
    };
    const body = res.json<StatsBody>();

    expect(body.totalClicks).toBe(4);
    expect(body.timeseries).toHaveLength(2); // Jan 1 and Jan 2
    expect(body.timeseries[0]).toMatchObject({ count: 2 });

    // FR appears 3 times, US once -> FR first.
    expect(body.topCountries[0]).toEqual({ key: 'FR', count: 3 });
    expect(body.topBrowsers.find((r: { key: string }) => r.key === 'unknown')?.count).toBe(1);
    expect(body.topDevices).toEqual(
      expect.arrayContaining([
        { key: 'desktop', count: 3 },
        { key: 'mobile', count: 1 },
      ]),
    );
  });

  it('returns zeros for a link with no clicks', async () => {
    const { headers, linkId } = await setup();
    const res = await app.inject({ method: 'GET', url: `/v1/links/${linkId}/stats`, headers });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ totalClicks: number; timeseries: unknown[] }>();
    expect(body.totalClicks).toBe(0);
    expect(body.timeseries).toEqual([]);
  });

  it("returns 404 for another user's link", async () => {
    const { linkId } = await setup();
    const intruder = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'intruder@example.com', password: 'SuperSecret123' },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/v1/links/${linkId}/stats`,
      headers: { authorization: `Bearer ${intruder.json<{ accessToken: string }>().accessToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects an inverted date range with 400', async () => {
    const { headers, linkId } = await setup();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/links/${linkId}/stats?from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z`,
      headers,
    });
    expect(res.statusCode).toBe(400);
  });
});
