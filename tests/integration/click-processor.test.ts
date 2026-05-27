import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Job } from 'bullmq';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { createClickRepository } from '@/modules/tracking/tracking.repository';
import { createClickProcessor } from '@/modules/tracking/tracking.processor';
import type { ClickJobData } from '@/modules/tracking/tracking.types';

describe('Click processor', () => {
  const processor = createClickProcessor(createClickRepository(prisma));

  // Build the app once to register a user + link to satisfy the FK.
  let linkId: string;

  beforeAll(async () => {
    await buildTestApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    const user = await prisma.user.create({
      data: { email: 'p@example.com', password: 'x' },
    });
    const link = await prisma.link.create({
      data: { code: 'abc1234', target: 'https://example.com', userId: user.id },
    });
    linkId = link.id;
  });

  function job(data: Partial<ClickJobData>): Job<ClickJobData> {
    return {
      data: {
        linkId,
        ip: '8.8.8.8',
        userAgent: 'Mozilla/5.0 (iPhone) Safari',
        referrer: 'https://news.ycombinator.com/item?id=1',
        ...data,
      },
    } as Job<ClickJobData>;
  }

  it('persists an enriched click and anonymizes the IP', async () => {
    await processor(job({}));

    const clicks = await prisma.click.findMany({ where: { linkId } });
    expect(clicks).toHaveLength(1);
    const click = clicks[0]!;
    expect(click.deviceType).toBe('mobile');
    expect(click.browser).toBe('Safari');
    expect(click.referrerHost).toBe('news.ycombinator.com');
    expect(click.country).toBeNull(); // best-effort resolver
    // IP is never stored in clear: 16-char hex hash.
    expect(click.ipHash).toMatch(/^[a-f0-9]{16}$/);
    expect(click.ipHash).not.toContain('8.8.8.8');
  });

  it('tolerates a missing referrer and empty UA', async () => {
    await processor(job({ referrer: null, userAgent: '' }));
    const click = (await prisma.click.findMany({ where: { linkId } }))[0]!;
    expect(click.referrerHost).toBeNull();
    expect(click.deviceType).toBe('desktop');
    expect(click.browser).toBeNull();
  });
});
