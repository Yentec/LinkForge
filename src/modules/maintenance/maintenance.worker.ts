import { Worker } from 'bullmq';
import { logger } from '@/config/logger';
import { prisma } from '@/shared/db';
import { createQueueConnection } from '@/shared/queue/connection';
import { MAINTENANCE_QUEUE_NAME, type CleanupJobData } from './maintenance.types';
import { createMaintenanceRepository } from './maintenance.repository';
import { createCleanupProcessor } from './maintenance.processor';

let worker: Worker<CleanupJobData> | null = null;

export function startMaintenanceWorker(): Worker<CleanupJobData> {
  if (worker) return worker;

  const processor = createCleanupProcessor(createMaintenanceRepository(prisma));
  worker = new Worker<CleanupJobData>(MAINTENANCE_QUEUE_NAME, processor, {
    connection: createQueueConnection(),
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Cleanup job failed');
  });

  return worker;
}

export async function stopMaintenanceWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
