import 'dotenv/config';
import { buildApp } from './app';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { disconnectDb } from '@/shared/db';
import { redis } from '@/shared/cache/redis';
import { startClickWorker, stopClickWorker } from '@/modules/tracking/tracking.worker';
import { closeClickQueue } from '@/modules/tracking/tracking.queue';

async function start(): Promise<void> {
  const app = await buildApp();

  startClickWorker();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down');
    await app.close();
    await stopClickWorker();
    await closeClickQueue();
    await disconnectDb();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
