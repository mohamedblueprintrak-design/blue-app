/**
 * Report Job Processor (STUB)
 *
 * Processes report-generation jobs from the REPORT queue.
 *
 * IMPORTANT: This is currently a STUB implementation. It logs a warning and
 * marks the job as done so jobs don't pile up forever in the queue (which
 * would previously happen because NO worker was started for the REPORT
 * queue — a dead queue). Replace the body of `reportProcessor` with the
 * real report-generation logic when implementing actual report rendering
 * (PDF/Excel export, scheduled project reports, financial summaries, etc.).
 *
 * When implementing the real processor, ensure that:
 *   - `organizationId` is validated (NEVER fall back to the first org in
 *     the DB — multi-tenant safety).
 *   - Long-running generation is offloaded appropriately.
 *   - Generated artifacts are stored in object storage, not on disk.
 */

import { Job } from 'bullmq';
import { log } from '@/lib/logger';

/**
 * Report job data structure.
 *
 * Kept intentionally loose — the real report payload schema will be
 * defined when the processor is implemented. For now, all we require is
 * `organizationId` (multi-tenant context) and an optional `reportType`.
 */
export interface ReportJobData {
  reportType?: string;
  organizationId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Process a report-generation job.
 *
 * STUB: logs a warning and completes the job (no-op) so jobs do not
 * accumulate indefinitely in the REPORT queue.
 */
export async function reportProcessor(job: Job<ReportJobData>): Promise<void> {
  const { reportType, organizationId, userId } = job.data;

  // Multi-tenant safety: even in the stub, refuse to process a job that is
  // missing tenant context. Failing fast here surfaces misconfigured callers
  // (e.g. a route that queues a report without setting organizationId)
  // BEFORE a real implementation can leak data across tenants.
  if (!organizationId) {
    log.error(
      '[Processor/Report] STUB: Job missing organizationId — refusing to process (multi-tenant safety)',
      {
        jobId: job.id,
        jobName: job.name,
        reportType,
        userId,
      }
    );
    throw new Error('Report job missing organizationId — cannot process without tenant context');
  }

  log.warn('[Processor/Report] STUB processor invoked — no real implementation yet', {
    jobId: job.id,
    jobName: job.name,
    reportType: reportType || '(unknown)',
    organizationId,
    userId,
    attempt: job.attemptsMade + 1,
  });

  // STUB: no work performed. Returning normally marks the job as completed
  // so it is removed from the active set per the queue's removeOnComplete
  // policy. Replace this with the real report-generation logic.
  return;
}
