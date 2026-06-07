// @ts-check
/**
 * Automation Service
 * خدمة الأتمتة
 * 
 * Handles event-driven automation rules across the application.
 */

import { db } from '@/lib/db';
import { sendEmailWithRetry } from '@/lib/email';
import { log } from '@/lib/logger';

export type EventType = 'TASK_COMPLETED' | 'INVOICE_SENT' | 'PROJECT_CREATED' | 'USER_INVITED';

interface AutomationEventPayload {
  organizationId: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

class AutomationService {
  /**
   * Fire an automation event
   */
  async triggerEvent(eventType: EventType, payload: AutomationEventPayload) {
    try {
      log.info(`[Automation] Triggering event ${eventType}`, { entityId: payload.entityId });
      
      switch (eventType) {
        case 'TASK_COMPLETED':
          await this.handleTaskCompleted(payload);
          break;
        case 'INVOICE_SENT':
          await this.handleInvoiceSent(payload);
          break;
        case 'PROJECT_CREATED':
          await this.handleProjectCreated(payload);
          break;
        case 'USER_INVITED':
          await this.handleUserInvited(payload);
          break;
        default:
          log.warn(`[Automation] Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      log.error(`[Automation] Error processing event ${eventType}`, error);
    }
  }

  private async handleTaskCompleted(payload: AutomationEventPayload) {
    const task = await db.task.findFirst({
      where: { id: payload.entityId, organizationId: payload.organizationId },
      include: { assignee: true, project: true }
    });

    if (!task) return;

    if (task.assignee?.email) {
      sendEmailWithRetry({
        to: task.assignee.email,
        subject: `Task Completed: ${task.title}`,
        html: `<p>The task <strong>${task.title}</strong> in project <strong>${task.project?.name}</strong> has been marked as completed.</p>`
      });
    }
  }

  private async handleInvoiceSent(payload: AutomationEventPayload) {
    const invoice = await db.invoice.findFirst({
      where: { id: payload.entityId, organizationId: payload.organizationId },
      include: { client: true }
    });

    if (!invoice || !invoice.client?.email) return;

    sendEmailWithRetry({
      to: invoice.client.email,
      subject: `New Invoice from BluePrint: ${invoice.number}`,
      html: `<p>Dear ${invoice.client.name},</p><p>You have received a new invoice (${invoice.number}) for the amount of ${invoice.total}. Please login to your portal to view it.</p>`
    });
  }

  private async handleProjectCreated(_payload: AutomationEventPayload) {
    // Notify managers
  }

  private async handleUserInvited(_payload: AutomationEventPayload) {
    // handled inside auth service usually, but can be centralized here
  }
}

export const automationService = new AutomationService();
