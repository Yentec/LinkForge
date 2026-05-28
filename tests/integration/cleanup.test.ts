import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Job } from 'bullmq';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';
import { buildTestApp, resetDb } from '../helpers/test-app';
import { createMaintenanceRepository } from '@/modules/maintenance/maintenance.repository';
import { createCleanupProcessor } from '@/modules/maintenance/maintenance.processor';
import type { CleanupJobData } from '@/modules/maintenance/maintenance.types';

describe('Cleanup processor', () => {
  const processor = createCleanupProcessor(createMaintenanceRepository(prisma));
  const job = { data: { reason: 'scheduled' } } as Job<CleanupJobData>;

  beforeAll(async () => {
    await buildTestApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(resetDb);

  it('deletes expired links but keeps valid ones', async () => {
    const user = await prisma.user.create({
      data: { email: 'u@example.com', password: 'x' },
    });
    await prisma.link.create({
      data: {
        code: 'expired',
        target: 'https://e.com',
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await prisma.link.create({
      data: {
        code: 'valid01',
        target: 'https://e.com',
        userId: user.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await prisma.link.create({
      data: { code: 'forever', target: 'https://e.com', userId: user.id },
    });

    await processor(job);

    const remaining = await prisma.link.findMany();
    expect(remaining.map((l) => l.code).sort()).toEqual(['forever', 'valid01']);
  });

  it('prunes stale non-demo users but keeps the demo account', async () => {
    const old = new Date(Date.now() - 8 * 86_400_000);
    await prisma.user.create({
      data: { email: 'demo@linkforge.dev', password: 'x', createdAt: old },
    });
    await prisma.user.create({
      data: { email: 'stale@example.com', password: 'x', createdAt: old },
    });
    await prisma.user.create({ data: { email: 'recent@example.com', password: 'x' } });

    await processor(job);

    const emails = (await prisma.user.findMany()).map((u) => u.email).sort();
    expect(emails).toEqual(['demo@linkforge.dev', 'recent@example.com']);
  });
});
