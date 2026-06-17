/**
 * Email Job Processor
 *
 * Processes email jobs from the EMAIL queue.
 * Uses the existing email service at @/lib/email which supports
 * SMTP, Resend API, and development mode (console logging).
 * Handles retries with exponential backoff (configured at queue level).
 */

import { Job } from 'bullmq';
import { log } from '@/lib/logger';
import { sendEmail, type EmailOptions } from '@/lib/email';

/**
 * Email job data structure
 */
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Process an email job.
 *
 * Expected job data:
 *   { to: string, subject: string, html: string, text?: string, from?: string }
 */
export async function emailProcessor(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, html, text, from } = job.data;

  log.info('[Processor/Email] Processing email job', {
    jobId: job.id,
    jobName: job.name,
    to,
    subject,
    attempt: job.attemptsMade + 1,
  });

  const emailOptions: EmailOptions = {
    to,
    subject,
    html,
    text,
    from,
  };

  const result = await sendEmail(emailOptions);

  if (result.sent) {
    log.info('[Processor/Email] Email sent successfully', {
      jobId: job.id,
      to,
      messageId: result.messageId,
      provider: result.provider,
    });
  } else if (result.simulated) {
    log.info('[Processor/Email] Email simulated (no transport configured)', {
      jobId: job.id,
      to,
      provider: result.provider,
    });
  } else {
    // Email failed — throw to trigger BullMQ retry with exponential backoff
    log.error('[Processor/Email] Email sending failed', undefined, {
      jobId: job.id,
      to,
      error: result.error,
      provider: result.provider,
      attempt: job.attemptsMade + 1,
    });
    throw new Error(`Email sending failed: ${result.error || 'Unknown error'}`);
  }
}
