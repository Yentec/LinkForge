import { Worker } from 'bullmq';
import { logger } from '@/config/logger';
import { prisma } from '@/shared/db';
import { createQueueConnection } from '@/shared/queue/connection';
import { CLICK_QUEUE_NAME, type ClickJobData } from './tracking.types';
import { createClickRepository } from './tracking.repository';
import { createClickProcessor } from './tracking.processor';

let worker: Worker<ClickJobData> | null = null;

/** Starts the click worker. Called from server.ts only (never in tests). */
export function startClickWorker(): Worker<ClickJobData> {
  if (worker) return worker;

  const processor = createClickProcessor(createClickRepository(prisma));
  worker = new Worker<ClickJobData>(CLICK_QUEUE_NAME, processor, {
    connection: createQueueConnection(),
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Click job failed');
  });

  logger.info('Click worker started');
  return worker;
}

export async function stopClickWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
