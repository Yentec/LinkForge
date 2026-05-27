import { Queue } from 'bullmq';
import { logger } from '@/config/logger';
import { createQueueConnection } from '@/shared/queue/connection';
import { CLICK_QUEUE_NAME, type ClickJobData } from './tracking.types';

let queue: Queue<ClickJobData> | null = null;

function getQueue(): Queue<ClickJobData> {
  queue ??= new Queue<ClickJobData>(CLICK_QUEUE_NAME, {
    connection: createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  return queue;
}

/**
 * Enqueues a click for async processing. Tracking must never break a redirect,
 * so failures are swallowed and logged.
 */
export async function enqueueClick(data: ClickJobData): Promise<void> {
  try {
    await getQueue().add('track', data);
  } catch (err) {
    logger.error({ err }, 'Failed to enqueue click');
  }
}

export async function closeClickQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
