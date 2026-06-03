/**
 * Notification Service
 * خدمة الإشعارات الموحدة
 *
 * Centralized service for creating and delivering notifications.
 * Combines database persistence with real-time WebSocket delivery
 * and WhatsApp Business API messaging.
 *
 * Supported delivery channels:
 * 1. Database persistence (always)
 * 2. WebSocket push (real-time, if available)
 * 3. WhatsApp message (optional, if configured and enabled)
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import type { NotificationType } from '@/types/db-enums';
import type { NotificationPayload } from '@/lib/websocket/types';
export type { NotificationType };

// ============================================
// Types
// ============================================

/** Notification delivery channels */
export type NotificationChannel = 'in_app' | 'whatsapp' | 'email';

/** Configuration for which channels to use for a notification */
export interface NotificationChannelConfig {
  inApp?: boolean;     // Default: true — persist to DB + WebSocket push
  whatsapp?: boolean;  // Default: false — send via WhatsApp Business API
  email?: boolean;     // Future: send via email
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  link?: string;
  projectId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  organizationId?: string;
  /** Override which channels to deliver this notification through */
  channels?: NotificationChannelConfig;
  /** Phone number for WhatsApp delivery (if not provided, looks up user/client phone) */
  whatsappPhone?: string;
  /** WhatsApp template name to use (defaults to free-form text message) */
  whatsappTemplate?: string;
  /** WhatsApp template language code (default: "ar") */
  whatsappLanguage?: string;
}

// ============================================
// Notification Service
// ============================================

class NotificationService {
  /**
   * Create a notification and deliver it through configured channels.
   *
   * Default channels: in-app only (database + WebSocket).
   * Set `channels.whatsapp = true` to also send via WhatsApp.
   */
  async create(input: CreateNotificationInput): Promise<{
    success: boolean;
    notificationId?: string;
    whatsappMessageId?: string;
    error?: string;
  }> {
    try {
      const channels = input.channels ?? { inApp: true };

      // ============================================
      // Channel 1: In-App (Database + WebSocket)
      // ============================================
      let notificationId: string | undefined;

      if (channels.inApp !== false) {
        const notification = await db.notification.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: input.titleAr, // Default to Arabic
            titleEn: input.titleEn,
            message: input.messageAr,
            messageEn: input.messageEn,
            link: input.link || '',
            projectId: input.projectId || null,
            priority: input.priority || 'MEDIUM',
            relatedEntityType: input.relatedEntityType || '',
            relatedEntityId: input.relatedEntityId || '',
            isRead: false,
          },
        });

        notificationId = notification.id;

        // Try to deliver via WebSocket
        await this.pushToUser(input.userId, {
          id: notification.id,
          type: input.type,
          title: input.titleAr,
          titleEn: input.titleEn,
          message: input.messageAr,
          messageEn: input.messageEn,
          link: input.link,
          priority: input.priority || 'MEDIUM',
          timestamp: notification.createdAt,
          isRead: false,
        });
      }

      // ============================================
      // Channel 2: WhatsApp
      // ============================================
      let whatsappMessageId: string | undefined;

      if (channels.whatsapp) {
        whatsappMessageId = await this.sendViaWhatsApp(input);
      }

      return { success: true, notificationId, whatsappMessageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('[NotificationService] Error creating notification:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulk(
    inputs: Omit<CreateNotificationInput, 'userId'>[],
    userIds: string[]
  ): Promise<{ success: boolean; created: number }> {
    let created = 0;

    for (const userId of userIds) {
      for (const input of inputs) {
        const result = await this.create({ ...input, userId });
        if (result.success) created++;
      }
    }

    return { success: true, created };
  }

  /**
   * Create notification for all users in an organization
   */
  async createForOrganization(
    input: Omit<CreateNotificationInput, 'userId'> & { organizationId: string }
  ): Promise<{ success: boolean; created: number }> {
    try {
      const users = await db.user.findMany({
        where: {
          organizationId: input.organizationId,
          isActive: true,
        },
        select: { id: true },
      });

      return this.createBulk(
        [input],
        users.map(u => u.id)
      );
    } catch (error) {
      log.error('[NotificationService] Error creating organization notification:', error);
      return { success: false, created: 0 };
    }
  }

  /**
   * Push notification to user via WebSocket
   */
  private async pushToUser(userId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { sendNotificationToUser } = await import('@/lib/websocket/websocket-service');
      await sendNotificationToUser(userId, payload as unknown as NotificationPayload);
    } catch {
      // WebSocket not available — notification is still persisted in DB
      // User will see it on next page load
      log.debug('[NotificationService] WebSocket not available — notification saved to DB only');
    }
  }

  // ============================================
  // WhatsApp Channel Delivery
  // ============================================

  /**
   * Send a notification via WhatsApp Business API.
   *
   * Resolution order for phone number:
   * 1. Explicit `whatsappPhone` on the input
   * 2. User's `phone` field from the User model
   * 3. Client's `whatsapp` or `phone` field (if related to a client)
   *
   * If a `whatsappTemplate` is provided, sends a template message.
   * Otherwise, sends a plain text message with the notification content.
   *
   * @returns WhatsApp message ID if sent successfully, undefined otherwise
   */
  private async sendViaWhatsApp(input: CreateNotificationInput): Promise<string | undefined> {
    try {
      // Dynamic import to avoid circular dependencies
      const { whatsappService } = await import('@/lib/services/whatsapp.service');

      if (!whatsappService.isConfigured) {
        log.debug('[NotificationService] WhatsApp not configured — skipping WhatsApp channel');
        return undefined;
      }

      // Resolve phone number
      let phone = input.whatsappPhone;

      if (!phone) {
        // Try to get phone from user record
        const user = await db.user.findUnique({
          where: { id: input.userId },
          select: { phone: true },
        });
        phone = user?.phone;
      }

      if (!phone) {
        log.debug('[NotificationService] No phone number available for WhatsApp delivery', {
          userId: input.userId,
        });
        return undefined;
      }

      // Clean phone number — strip non-digits
      const cleanedPhone = phone.replace(/[^\d]/g, '');
      if (cleanedPhone.length < 7) {
        log.warn('[NotificationService] Phone number too short for WhatsApp', {
          userId: input.userId,
          phone: cleanedPhone.substring(0, 3) + '...',
        });
        return undefined;
      }

      // Send via template or plain text
      let result;

      if (input.whatsappTemplate) {
        // Use a pre-approved template message
        result = await whatsappService.sendTemplateMessage(
          cleanedPhone,
          input.whatsappTemplate,
          input.whatsappLanguage || 'ar'
        );
      } else {
        // Send a plain text message with the notification content
        const message = input.messageAr || input.messageEn;
        if (!message) {
          log.debug('[NotificationService] No message content for WhatsApp delivery');
          return undefined;
        }

        result = await whatsappService.sendTextMessage(cleanedPhone, message);
      }

      if (result.success && result.messageId) {
        log.info('[NotificationService] WhatsApp notification sent', {
          userId: input.userId,
          phone: cleanedPhone.substring(0, 3) + '...',
          messageId: result.messageId,
        });
        return result.messageId;
      } else {
        log.warn('[NotificationService] WhatsApp delivery failed', {
          userId: input.userId,
          error: result.error,
        });
        return undefined;
      }
    } catch (error) {
      log.error('[NotificationService] WhatsApp channel error', error, {
        userId: input.userId,
      });
      return undefined;
    }
  }

  /**
   * Send a notification via WhatsApp to a client (not a user).
   * This is useful for client-facing notifications like invoice reminders,
   * project updates, meeting reminders, etc.
   *
   * @param clientId - The client ID to send the WhatsApp message to
   * @param message - The message text to send
   * @param options - Optional: template name, language, organizationId, related entity
   * @returns WhatsApp message ID if sent successfully
   */
  async sendWhatsAppToClient(
    clientId: string,
    message: string,
    options?: {
      templateName?: string;
      language?: string;
      organizationId?: string;
      relatedType?: string;
      relatedId?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { whatsappService } = await import('@/lib/services/whatsapp.service');

      if (!whatsappService.isConfigured) {
        return { success: false, error: 'WhatsApp not configured' };
      }

      // Look up client's WhatsApp number
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: {
          whatsapp: true,
          phone: true,
          name: true,
          nameEn: true,
        },
      });

      if (!client) {
        return { success: false, error: 'Client not found' };
      }

      const phone = client.whatsapp || client.phone;
      if (!phone) {
        return { success: false, error: 'Client has no WhatsApp or phone number' };
      }

      const cleanedPhone = phone.replace(/[^\d]/g, '');
      if (cleanedPhone.length < 7) {
        return { success: false, error: 'Invalid phone number format' };
      }

      let result;
      if (options?.templateName) {
        result = await whatsappService.sendTemplateMessage(
          cleanedPhone,
          options.templateName,
          options.language || 'ar'
        );
      } else {
        result = await whatsappService.sendTextMessage(cleanedPhone, message);
      }

      if (result.success) {
        log.info('[NotificationService] WhatsApp sent to client', {
          clientId,
          messageId: result.messageId,
        });
      }

      return { success: result.success, messageId: result.messageId, error: result.error };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('[NotificationService] Error sending WhatsApp to client', error, { clientId });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await db.notification.update({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<boolean> {
    try {
      await db.notification.delete({
        where: { id: notificationId, userId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return db.notification.count({
        where: { userId, isRead: false },
      });
    } catch {
      return 0;
    }
  }

  // ============================================
  // Convenience Methods for Common Notifications
  // ============================================

  /**
   * Notify user of task assignment
   */
  async notifyTaskAssigned(userId: string, taskName: string, taskNameEn: string, projectId?: string, sendWhatsApp?: boolean): Promise<void> {
    await this.create({
      userId,
      type: 'TASK_DUE',
      titleAr: 'مهمة جديدة',
      titleEn: 'New Task',
      messageAr: `تم تعيين مهمة "${taskName}" لك`,
      messageEn: `Task "${taskNameEn}" has been assigned to you`,
      projectId,
      priority: 'MEDIUM',
      channels: sendWhatsApp ? { inApp: true, whatsapp: true } : undefined,
    });
  }

  /**
   * Notify user of overdue task
   */
  async notifyTaskOverdue(userId: string, taskName: string, taskNameEn: string, projectId?: string, sendWhatsApp?: boolean): Promise<void> {
    await this.create({
      userId,
      type: 'TASK_DUE',
      titleAr: 'مهمة متأخرة',
      titleEn: 'Overdue Task',
      messageAr: `المهمة "${taskName}" تجاوزت الموعد المحدد`,
      messageEn: `Task "${taskNameEn}" has passed its due date`,
      projectId,
      priority: 'HIGH',
      channels: sendWhatsApp ? { inApp: true, whatsapp: true } : undefined,
    });
  }

  /**
   * Notify user of invoice overdue
   */
  async notifyInvoiceOverdue(userId: string, invoiceNumber: string, projectId?: string, sendWhatsApp?: boolean): Promise<void> {
    await this.create({
      userId,
      type: 'INVOICE_OVERDUE',
      titleAr: 'فاتورة متأخرة',
      titleEn: 'Overdue Invoice',
      messageAr: `الفاتورة ${invoiceNumber} تجاوزت تاريخ الاستحقاق`,
      messageEn: `Invoice ${invoiceNumber} has passed its due date`,
      projectId,
      priority: 'HIGH',
      channels: sendWhatsApp ? { inApp: true, whatsapp: true } : undefined,
    });
  }

  /**
   * Notify user of approval required
   */
  async notifyApprovalRequired(userId: string, approvalType: string, approvalTypeEn: string, projectId?: string, sendWhatsApp?: boolean): Promise<void> {
    await this.create({
      userId,
      type: 'APPROVAL_NEEDED',
      titleAr: 'موافقة مطلوبة',
      titleEn: 'Approval Required',
      messageAr: `يحتاج "${approvalType}" موافقتك`,
      messageEn: `"${approvalTypeEn}" requires your approval`,
      projectId,
      priority: 'HIGH',
      channels: sendWhatsApp ? { inApp: true, whatsapp: true } : undefined,
    });
  }

  /**
   * Notify user of meeting reminder
   */
  async notifyMeetingReminder(userId: string, meetingTitle: string, meetingTitleEn: string, sendWhatsApp?: boolean): Promise<void> {
    await this.create({
      userId,
      type: 'SYSTEM_ALERT',
      titleAr: 'تذكير اجتماع',
      titleEn: 'Meeting Reminder',
      messageAr: `اجتماع "${meetingTitle}" خلال 15 دقيقة`,
      messageEn: `Meeting "${meetingTitleEn}" starts in 15 minutes`,
      priority: 'URGENT',
      channels: sendWhatsApp ? { inApp: true, whatsapp: true } : undefined,
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
