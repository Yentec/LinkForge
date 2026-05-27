import type { Job } from 'bullmq';
import { env } from '@/config/env';
import { sha256 } from '@/shared/auth/tokens';
import { parseUserAgent } from '@/shared/utils/user-agent';
import { resolveCountry } from '@/shared/geo/geo';
import type { ClickRepository } from './tracking.repository';
import type { ClickJobData } from './tracking.types';

function safeHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

/**
 * Pure processor factory. Kept independent of BullMQ wiring so it can be
 * unit-tested by calling it with a minimal job object.
 */
export function createClickProcessor(repo: ClickRepository) {
  return async (job: Job<ClickJobData>): Promise<void> => {
    const { linkId, ip, userAgent, referrer } = job.data;
    const ua = parseUserAgent(userAgent);
    const country = await resolveCountry(ip);

    // Anonymize the IP: store only a salted, truncated one-way hash (GDPR).
    const ipHash = sha256(`${ip}${env.IP_HASH_SALT}`).slice(0, 16);

    await repo.create({
      linkId,
      country,
      deviceType: ua.deviceType,
      browser: ua.browser,
      referrerHost: safeHost(referrer),
      ipHash,
    });
  };
}
