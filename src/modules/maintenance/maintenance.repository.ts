import type { PrismaClient } from '@prisma/client';

const DEMO_EMAIL = 'demo@linkforge.dev';

export type MaintenanceRepository = ReturnType<typeof createMaintenanceRepository>;

export function createMaintenanceRepository(db: PrismaClient) {
  return {
    deleteExpiredLinks: (now: Date) =>
      db.link.deleteMany({
        where: { expiresAt: { not: null, lt: now } },
      }),

    deleteStaleUsers: (cutoff: Date) =>
      db.user.deleteMany({
        where: { email: { not: DEMO_EMAIL }, createdAt: { lt: cutoff } },
      }),
  };
}
