import { Queue } from 'bullmq';
import { logger } from '@/config/logger';
import { createQueueConnection } from '@/shared/queue/connection';
import {
  CLEANUP_SCHEDULER_ID,
  MAINTENANCE_QUEUE_NAME,
  type CleanupJobData,
} from './maintenance.types';

let queue: Queue<CleanupJobData> | null = null;

function getQueue(): Queue<CleanupJobData> {
  queue ??= new Queue<CleanupJobData>(MAINTENANCE_QUEUE_NAME, {
    connection: createQueueConnection(),
    defaultJobOptions: { removeOnComplete: 50, removeOnFail: 50 },
  });
  return queue;
}

/** Idempotent: upserting the same scheduler id just updates the schedule. */
export async function scheduleCleanup(everyMs: number): Promise<void> {
  try {
    await getQueue().upsertJobScheduler(
      CLEANUP_SCHEDULER_ID,
      { every: everyMs },
      { name: 'cleanup', data: { reason: 'scheduled' } },
    );
    logger.info({ everyMs }, 'Cleanup scheduler registered');
  } catch (err) {
    logger.error({ err }, 'Failed to register cleanup scheduler');
  }
}

export async function closeMaintenanceQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
