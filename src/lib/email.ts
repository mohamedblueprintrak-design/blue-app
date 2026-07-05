// Email service using nodemailer (SMTP) or Resend API
// For development (no provider configured), logs emails to console
// For production, configure SMTP or Resend

import nodemailer from 'nodemailer';
import { log } from '@/lib/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // Optional override for "from" address
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

// ============================================
// Email Result Types
// ============================================

export interface EmailResult {
  /** Whether the email was actually sent via transport */
  sent: boolean;
  /** Whether the email was simulated (no transport configured) */
  simulated: boolean;
  /** Message ID from transport if actually sent */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** Which provider was used */
  provider?: 'smtp' | 'resend' | 'dev';
}

// ============================================
// Provider Detection
// ============================================

type EmailProvider = 'smtp' | 'resend' | 'dev';

function detectProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (configured === 'resend' && process.env.RESEND_API_KEY) {
    return 'resend';
  }
  // Support both SMTP_PASSWORD and SMTP_PASS for backwards compatibility
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass) {
    return 'smtp';
  }
  if (configured === 'smtp') {
    log.warn('[Email] EMAIL_PROVIDER=smtp but SMTP credentials are incomplete — falling back to dev mode');
  }
  return 'dev';
}

// ============================================
// Email Queue with Retry Logic
// ============================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay for exponential backoff

interface QueuedEmail {
  id: string;
  options: EmailOptions;
  retryCount: number;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'simulated';
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class EmailQueue {
  private queue: Map<string, QueuedEmail> = new Map();
  private processing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private needsReprocess = false;

  /**
   * Add an email to the queue
   */
  enqueue(options: EmailOptions): string {
    const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    this.queue.set(id, {
      id,
      options,
      retryCount: 0,
      status: 'pending',
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    });

    log.info('[EmailQueue] Email enqueued', { id, to: options.to, subject: options.subject });
    if (this.processing) { this.needsReprocess = true; }
    this.scheduleProcessing();
    return id;
  }

  /**
   * Get the status of a queued email
   */
  getStatus(id: string): QueuedEmail | undefined {
    return this.queue.get(id);
  }

  /**
   * Get queue statistics
   */
  getStats(): { pending: number; sending: number; sent: number; failed: number; simulated: number; total: number } {
    const stats = { pending: 0, sending: 0, sent: 0, failed: 0, simulated: 0, total: this.queue.size };
    for (const email of this.queue.values()) {
      stats[email.status]++;
    }
    return stats;
  }

  /**
   * Schedule processing of the queue
   */
  private scheduleProcessing(): void {
    if (this.processing) return;

    // Find the earliest nextRetryAt among pending emails
    let earliestRetry: Date | null = null;
    for (const email of this.queue.values()) {
      if (email.status === 'pending' && email.nextRetryAt) {
        if (!earliestRetry || email.nextRetryAt < earliestRetry) {
          earliestRetry = email.nextRetryAt;
        }
      }
    }

    if (!earliestRetry) return;

    const delay = Math.max(0, earliestRetry.getTime() - Date.now());

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  /**
   * Process all due emails in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = new Date();

      for (const email of this.queue.values()) {
        if (email.status !== 'pending') continue;
        if (email.nextRetryAt && email.nextRetryAt > now) continue;

        email.status = 'sending';
        email.updatedAt = new Date();

        const result = await executeSendEmail(email.options);

        if (result.simulated) {
          // No transport configured — mark as simulated (not a failure)
          email.status = 'simulated';
          email.updatedAt = new Date();
          log.info('[EmailQueue] Email simulated (no transport configured)', { id: email.id, to: email.options.to });
          setTimeout(() => this.queue.delete(email.id), 5 * 60 * 1000);
        } else if (result.sent) {
          email.status = 'sent';
          email.updatedAt = new Date();
          log.info('[EmailQueue] Email sent successfully', { id: email.id, to: email.options.to, messageId: result.messageId, provider: result.provider });
          setTimeout(() => this.queue.delete(email.id), 5 * 60 * 1000);
        } else {
          // Failed — retry with exponential backoff
          email.retryCount++;
          email.lastError = result.error;
          email.updatedAt = new Date();

          if (email.retryCount >= MAX_RETRIES) {
            email.status = 'failed';
            log.error('[EmailQueue] Email failed after max retries', {
              id: email.id,
              to: email.options.to,
              retries: email.retryCount,
              error: result.error,
            });
            setTimeout(() => this.queue.delete(email.id), 5 * 60 * 1000);
          } else {
            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = BASE_DELAY_MS * Math.pow(2, email.retryCount - 1);
            email.nextRetryAt = new Date(Date.now() + backoffMs);
            email.status = 'pending';
            log.warn('[EmailQueue] Email failed, scheduling retry', {
              id: email.id,
              to: email.options.to,
              retry: email.retryCount,
              nextRetryIn: `${backoffMs}ms`,
              error: result.error,
            });
          }
        }
      }
    } finally {
      this.processing = false;
      if (this.needsReprocess) {
        this.needsReprocess = false;
        this.processQueue();
      } else {
        this.scheduleProcessing();
      }
    }
  }
}

// Singleton queue instance
export const emailQueue = new EmailQueue();

// ============================================
// SMTP Configuration Check
// ============================================

/**
 * Check if SMTP is properly configured
 */
export function isSmtpConfigured(): boolean {
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass);
}

/**
 * Check if Resend is properly configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Check if any email transport is configured
 */
export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isResendConfigured();
}

/**
 * Get the current email provider
 */
export function getEmailProvider(): EmailProvider {
  return detectProvider();
}

// ============================================
// SMTP Transport
// ============================================

// Create transporter based on environment
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  // Support both SMTP_PASSWORD and SMTP_PASS for backwards compatibility
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
}

// ============================================
// Resend API Transport
// ============================================

async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from } = options;
  const emailFrom = from || process.env.EMAIL_FROM || 'noreply@blueprint.ae';
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { sent: false, simulated: false, error: 'RESEND_API_KEY not configured', provider: 'resend' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `"BluePrint" <${emailFrom}>`,
        to: [to],
        subject,
        html,
        text: text || undefined,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
        })) || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || data.error?.message || `Resend API error: ${response.status}`;
      log.error('[Email] Resend API error', undefined, { status: response.status, error: errorMsg });
      return { sent: false, simulated: false, error: errorMsg, provider: 'resend' };
    }

    log.info('[Email] Email sent via Resend', { messageId: data.id, to, subject });
    return { sent: true, simulated: false, messageId: data.id, provider: 'resend' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('[Email] Failed to send email via Resend', error, { to, subject });
    return { sent: false, simulated: false, error: errorMessage, provider: 'resend' };
  }
}

// ============================================
// Core Email Sending
// ============================================

/**
 * Internal function that actually sends the email and returns detailed result.
 * Used by both sendEmail and EmailQueue.
 * Routes to the appropriate provider (SMTP, Resend, or dev mode).
 */
async function executeSendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text } = options;
  const emailFrom = options.from || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@blueprint.ae';

  const provider = detectProvider();

  if (provider === 'dev') {
    log.warn('[Email] No email transport configured — email simulated (not actually sent)', { from: emailFrom, to, subject });
    log.info('[Email] Email content (dev mode)', { from: emailFrom, to, subject, text: text?.substring(0, 200) });
    return { sent: false, simulated: true, provider: 'dev' };
  }

  // Resend provider
  if (provider === 'resend') {
    return sendViaResend({ ...options, from: emailFrom });
  }

  // SMTP provider (default)
  const transporter = createTransporter();

  if (!transporter) {
    log.warn('[Email] SMTP transport creation failed — email simulated', { from: emailFrom, to, subject });
    return { sent: false, simulated: true, provider: 'dev' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"BluePrint" <${emailFrom}>`,
      to,
      subject,
      html,
      text: text || undefined,
      attachments: options.attachments || undefined,
    });

    log.info('[Email] Email sent successfully via SMTP', { messageId: info.messageId, to, subject });
    return { sent: true, simulated: false, messageId: info.messageId, provider: 'smtp' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('[Email] Failed to send email via SMTP', error, { to, subject });
    return { sent: false, simulated: false, error: errorMessage, provider: 'smtp' };
  }
}

/**
 * Send an email immediately (no queue).
 * Routes to the configured provider (SMTP, Resend, or dev mode).
 * In development mode (no provider configured), logs the email to console.
 * In production mode, sends the email via the configured transport.
 *
 * Returns detailed information about whether the email was actually sent or simulated.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  return executeSendEmail(options);
}

/**
 * Enqueue an email for sending with automatic retry on failure.
 * Uses exponential backoff (1s, 2s, 4s) up to MAX_RETRIES (3) attempts.
 *
 * SECURITY/RELIABILITY FIX: Previously this used an in-memory Map queue only.
 * On multi-instance deployments (Docker Swarm, k8s), emails were processed
 * only by the instance that enqueued them — and if that instance crashed,
 * all pending emails were lost. Now uses BullMQ (Redis-backed) for durability,
 * with fallback to the in-memory queue if Redis is unavailable (dev mode).
 *
 * Returns the queue item ID (BullMQ job ID or in-memory ID) for status tracking.
 */
export async function sendEmailWithRetry(options: EmailOptions): Promise<string> {
  // Try BullMQ (Redis-backed) first for durability + multi-instance support
  try {
    const { getQueue, QUEUES, isRedisAvailable } = await import('@/lib/queue');
    if (isRedisAvailable()) {
      const emailQueue = getQueue(QUEUES.EMAIL);
      const job = await emailQueue.add('send-email', {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        from: options.from,
      });
      log.info('[Email] Enqueued to BullMQ', {
        jobId: job.id,
        to: options.to,
        subject: options.subject,
      });
      return job.id ?? `bullmq_${Date.now()}`;
    }
  } catch (error) {
    log.warn('[Email] BullMQ enqueue failed, falling back to in-memory queue', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fallback: in-memory queue (single-instance, not durable)
  return emailQueue.enqueue(options);
}

/**
 * Send multiple emails (batch)
 */
export async function sendBatchEmails(emails: EmailOptions[]): Promise<{
  sent: number;
  failed: number;
  simulated: number;
}> {
  let sent = 0;
  let failed = 0;
  let simulated = 0;

  for (const email of emails) {
    const result = await sendEmail(email);
    if (result.sent) {
      sent++;
    } else if (result.simulated) {
      simulated++;
    } else {
      failed++;
    }
  }

  return { sent, failed, simulated };
}

/**
 * Test email connection / configuration
 */
export async function testEmailConnection(): Promise<{
  success: boolean;
  message: string;
  configured: boolean;
  provider?: EmailProvider;
}> {
  const provider = detectProvider();

  if (provider === 'dev') {
    log.warn('[Email] No email transport is configured — emails will be simulated (not actually sent)');
    return {
      success: false,
      message: 'No email transport configured. Running in development mode. Emails will be simulated.',
      configured: false,
      provider: 'dev',
    };
  }

  if (provider === 'resend') {
    // Test Resend by checking the API key format
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        message: 'RESEND_API_KEY is not set.',
        configured: false,
        provider: 'resend',
      };
    }
    return {
      success: true,
      message: 'Resend API key is configured.',
      configured: true,
      provider: 'resend',
    };
  }

  // SMTP
  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      message: 'SMTP configuration is incomplete.',
      configured: false,
      provider: 'smtp',
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection successful.',
      configured: true,
      provider: 'smtp',
    };
  } catch (error) {
    return {
      success: false,
      message: `SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      configured: true,
      provider: 'smtp',
    };
  }
}

const emailService = {
  sendEmail,
  sendEmailWithRetry,
  sendBatchEmails,
  testEmailConnection,
  isSmtpConfigured,
  isResendConfigured,
  isEmailConfigured,
  getEmailProvider,
  emailQueue,
};

export default emailService;
