/**
 * Cleanup Job Processor (STUB)
 *
 * Processes cleanup jobs from the CLEANUP queue.
 *
 * IMPORTANT: This is currently a STUB implementation. It logs a warning and
 * marks the job as done so jobs don't pile up forever in the queue (which
 * would previously happen because NO worker was started for the CLEANUP
 * queue — a dead queue). Replace the body of `cleanupProcessor` with the
 * real cleanup logic when implementing actual cleanup tasks (e.g. purging
 * expired refresh tokens, pruning old audit logs, GC of orphaned S3
 * objects, etc.).
 *
 * NOTE: There is a separate `/api/cron/cleanup` cron endpoint (vercel.json
 * `0 * * * *`) that runs its own ad-hoc cleanup logic. This processor is
 * for ON-DEMAND cleanup jobs dispatched through the CLEANUP queue. Do not
 * confuse the two paths.
 *
 * When implementing the real processor, ensure that:
 *   - `organizationId` is validated (NEVER fall back to the first org in
 *     the DB — multi-tenant safety).
 *   - Destructive operations (deleteMany, etc.) are scoped by organizationId
 *     AND by a time/id window to avoid accidental mass deletion.
 */

import { Job } from 'bullmq';
import { log } from '@/lib/logger';

/**
 * Cleanup job data structure.
 *
 * Kept intentionally loose — the real cleanup payload schema will be
 * defined when the processor is implemented. For now, all we require is
 * `organizationId` (multi-tenant context) and an optional `cleanupType`.
 */
export interface CleanupJobData {
  cleanupType?: string;
  organizationId?: string;
  olderThan?: string; // ISO date string — optional cutoff
  [key: string]: unknown;
}

/**
 * Process a cleanup job.
 *
 * STUB: logs a warning and completes the job (no-op) so jobs do not
 * accumulate indefinitely in the CLEANUP queue.
 */
export async function cleanupProcessor(job: Job<CleanupJobData>): Promise<void> {
  const { cleanupType, organizationId, olderThan } = job.data;

  // Multi-tenant safety: even in the stub, refuse to process a job that is
  // missing tenant context. Cleanup jobs are inherently destructive — a
  // missing organizationId MUST NOT be allowed to default to "first org in
  // DB" (or worse, an empty filter that matches every org).
  if (!organizationId) {
    log.error(
      '[Processor/Cleanup] STUB: Job missing organizationId — refusing to process (multi-tenant safety)',
      {
        jobId: job.id,
        jobName: job.name,
        cleanupType,
        olderThan,
      }
    );
    throw new Error('Cleanup job missing organizationId — cannot process without tenant context');
  }

  log.warn('[Processor/Cleanup] STUB processor invoked — no real implementation yet', {
    jobId: job.id,
    jobName: job.name,
    cleanupType: cleanupType || '(unknown)',
    organizationId,
    olderThan,
    attempt: job.attemptsMade + 1,
  });

  // STUB: no work performed. Returning normally marks the job as completed
  // so it is removed from the active set per the queue's removeOnComplete
  // policy. Replace this with the real cleanup logic.
  return;
}
