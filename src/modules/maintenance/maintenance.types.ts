export const MAINTENANCE_QUEUE_NAME = 'maintenance';
export const CLEANUP_SCHEDULER_ID = 'cleanup-scheduler';

export interface CleanupJobData {
  reason: 'scheduled';
}
