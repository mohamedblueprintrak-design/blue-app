/**
 * Automation Job Processor
 *
 * Processes automation trigger jobs from the AUTOMATION queue.
 * Evaluates conditions defined in the automation's triggerConfig
 * and executes the specified actions.
 */

import { Job } from 'bullmq';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import type { TaskPriority } from '@/types/db-enums';

/**
 * Automation job data structure
 */
export interface AutomationJobData {
  automationId: string;
  triggerEvent: string;
  payload: Record<string, unknown>;
  organizationId?: string;
}

/**
 * Process an automation job.
 *
 * The job evaluates the automation's trigger conditions and executes
 * the configured actions if conditions are met.
 */
export async function automationProcessor(job: Job<AutomationJobData>): Promise<void> {
  const { automationId, triggerEvent, payload, organizationId } = job.data;

  log.info('[Processor/Automation] Processing automation job', {
    jobId: job.id,
    jobName: job.name,
    automationId,
    triggerEvent,
    attempt: job.attemptsMade + 1,
  });

  // Fetch the automation definition
  const automation = await db.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    log.warn('[Processor/Automation] Automation not found', { automationId });
    return;
  }

  if (automation.status !== 'ACTIVE') {
    log.info('[Processor/Automation] Automation is not active, skipping', {
      automationId,
      status: automation.status,
    });
    return;
  }

  // Parse trigger and action configs
  let triggerConfig: Record<string, unknown> = {};
  let actionConfig: Record<string, unknown> = {};

  try {
    triggerConfig = automation.triggerConfig ? JSON.parse(automation.triggerConfig) : {};
  } catch {
    log.error('[Processor/Automation] Invalid triggerConfig JSON', { automationId });
  }

  try {
    actionConfig = automation.actionConfig ? JSON.parse(automation.actionConfig) : {};
  } catch {
    log.error('[Processor/Automation] Invalid actionConfig JSON', { automationId });
  }

  // Evaluate conditions
  const conditionsMet = evaluateConditions(triggerConfig, payload);

  if (!conditionsMet) {
    log.info('[Processor/Automation] Conditions not met, skipping execution', {
      automationId,
      triggerEvent,
    });
    return;
  }

  // Execute actions
  try {
    const orgId: string | undefined = (automation.organizationId ?? organizationId ?? undefined) as string | undefined;
    await executeAction(automation.actionType as string ?? 'NOTIFICATION', actionConfig, payload, orgId);

    // Update automation run count and last run timestamp
    await db.automation.update({
      where: { id: automationId },
      data: {
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    });

    log.info('[Processor/Automation] Automation executed successfully', {
      automationId,
      actionType: automation.actionType,
    });
  } catch (error) {
    log.error('[Processor/Automation] Automation execution failed', error, {
      automationId,
      actionType: automation.actionType,
    });
    throw error; // Re-throw to trigger BullMQ retry
  }
}

/**
 * Evaluate automation trigger conditions against the event payload.
 *
 * Supported condition types:
 *   - threshold: Compare a numeric value against a threshold
 *   - event: Match an event name exactly
 *   - schedule: Time-based (handled by cron, not here)
 */
function evaluateConditions(
  triggerConfig: Record<string, unknown>,
  payload: Record<string, unknown>
): boolean {
  const { metric, threshold, operator, event } = triggerConfig;

  // Event-based trigger — match the event name
  if (event && typeof event === 'string') {
    return payload.event === event || payload.type === event;
  }

  // Threshold-based trigger — compare a metric against a threshold
  if (metric && threshold !== undefined) {
    const value = payload[metric as string];
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(String(threshold));

    if (isNaN(numValue) || isNaN(numThreshold)) {
      return false;
    }

    switch (operator) {
      case 'gt':
        return numValue > numThreshold;
      case 'gte':
        return numValue >= numThreshold;
      case 'lt':
        return numValue < numThreshold;
      case 'lte':
        return numValue <= numThreshold;
      case 'eq':
        return numValue === numThreshold;
      default:
        return numValue >= numThreshold;
    }
  }

  // No conditions defined — always execute
  return true;
}

/**
 * Execute the automation action.
 *
 * Supported action types:
 *   - notification: Create in-app notifications
 *   - email: Send email notifications
 *   - task: Create a new task
 *   - webhook: Send an HTTP POST request
 */
async function executeAction(
  actionType: string,
  actionConfig: Record<string, unknown>,
  payload: Record<string, unknown>,
  organizationId?: string
): Promise<void> {
  switch (actionType) {
    case 'notification':
      await executeNotificationAction(actionConfig, payload, organizationId);
      break;

    case 'email':
      await executeEmailAction(actionConfig, payload);
      break;

    case 'task':
      await executeTaskAction(actionConfig, payload, organizationId);
      break;

    case 'webhook':
      await executeWebhookAction(actionConfig, payload);
      break;

    default:
      log.warn('[Processor/Automation] Unknown action type', { actionType });
  }
}

/**
 * Execute a notification action
 */
async function executeNotificationAction(
  config: Record<string, unknown>,
  _payload: Record<string, unknown>,
  organizationId?: string
): Promise<void> {
  const { userIds, title, titleEn, message, messageEn, type, priority, link } = config;

  if (!userIds || !Array.isArray(userIds)) {
    log.warn('[Processor/Automation] Notification action missing userIds');
    return;
  }

  // Dynamic import to avoid circular dependency
  const { notificationService } = await import('@/lib/services/notification.service');

  for (const userId of userIds as string[]) {
    await notificationService.create({
      userId,
      type: (type as any) || 'system_alert', // eslint-disable-line @typescript-eslint/no-explicit-any
      titleAr: (title as string) || 'إشعار تلقائي',
      titleEn: (titleEn as string) || 'Automated Notification',
      messageAr: (message as string) || '',
      messageEn: (messageEn as string) || '',
      link: link as string,
      priority: (priority as any) || 'MEDIUM', // eslint-disable-line @typescript-eslint/no-explicit-any
      organizationId,
    });
  }

  log.info('[Processor/Automation] Notification action executed', {
    recipientCount: userIds.length,
  });
}

/**
 * Execute an email action
 */
async function executeEmailAction(
  config: Record<string, unknown>,
  _payload: Record<string, unknown>
): Promise<void> {
  const { recipients, subject, htmlBody } = config;

  if (!recipients || !Array.isArray(recipients) || !subject || !htmlBody) {
    log.warn('[Processor/Automation] Email action missing required fields');
    return;
  }

  // Dynamic import to avoid circular dependency
  const { addJob, QUEUES } = await import('@/lib/queue/index');

  for (const to of recipients as string[]) {
    await addJob(QUEUES.EMAIL, 'automation-email', {
      to,
      subject: subject as string,
      html: htmlBody as string,
    });
  }

  log.info('[Processor/Automation] Email action executed', {
    recipientCount: recipients.length,
  });
}

/**
 * Execute a task creation action
 */
async function executeTaskAction(
  config: Record<string, unknown>,
  _payload: Record<string, unknown>,
  organizationId?: string
): Promise<void> {
  const { projectId, title, assigneeId, priority, dueDate } = config;

  if (!title) {
    log.warn('[Processor/Automation] Task action missing title');
    return;
  }

  await db.task.create({
    data: {
      projectId: (projectId as string) || null,
      title: title as string,
      assigneeId: (assigneeId as string) || null,
      priority: (priority as TaskPriority) || 'NORMAL',
      dueDate: dueDate ? new Date(dueDate as string) : null,
      status: 'TODO',
      organizationId: organizationId || null,
    },
  });

  log.info('[Processor/Automation] Task action executed', {
    title,
    projectId,
    assigneeId,
  });
}

/**
 * Execute a webhook action
 */
async function executeWebhookAction(
  config: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<void> {
  const { url, method, headers } = config;

  if (!url) {
    log.warn('[Processor/Automation] Webhook action missing URL');
    return;
  }

  try {
    const response = await fetch(url as string, {
      method: (method as string) || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers as Record<string, string> || {}),
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}`);
    }

    log.info('[Processor/Automation] Webhook action executed', {
      url,
      status: response.status,
    });
  } catch (error) {
    log.error('[Processor/Automation] Webhook action failed', error, { url });
    throw error; // Re-throw to trigger retry
  }
}
