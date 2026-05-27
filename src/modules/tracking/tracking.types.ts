export interface ClickJobData {
  linkId: string;
  ip: string;
  userAgent: string;
  referrer: string | null;
}

export const CLICK_QUEUE_NAME = 'clicks';
