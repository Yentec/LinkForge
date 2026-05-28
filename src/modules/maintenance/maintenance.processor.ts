import type { Job } from 'bullmq';
import { logger } from '@/config/logger';
import type { MaintenanceRepository } from './maintenance.repository';
import type { CleanupJobData } from './maintenance.types';

const STALE_USER_DAYS = 7;

export function createCleanupProcessor(repo: MaintenanceRepository) {
  return async (_job: Job<CleanupJobData>): Promise<void> => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - STALE_USER_DAYS * 86_400_000);

    const expired = await repo.deleteExpiredLinks(now);
    const stale = await repo.deleteStaleUsers(cutoff);

    logger.info({ expiredLinks: expired.count, staleUsers: stale.count }, 'Cleanup run complete');
  };
}
