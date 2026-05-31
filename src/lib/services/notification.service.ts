/**
 * Notification Service
 * خدمة الإشعارات الموحدة
 *
 * Centralized service for creating and delivering notifications.
 * Combines database persistence with real-time WebSocket delivery.
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { NotificationType as PrismaNotificationType } from '@prisma/client';

// ============================================
// Types
// ============================================

export type NotificationType = PrismaNotificationType;

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
}

// ============================================
// Notification Service
// ============================================

class NotificationService {
  /**
   * Create a notification and deliver it in real-time
   */
  async create(input: CreateNotificationInput): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    try {
      // Create notification in database
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

      return { success: true, notificationId: notification.id };
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
      await sendNotificationToUser(userId, payload as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch {
      // WebSocket not available — notification is still persisted in DB
      // User will see it on next page load
      log.debug('[NotificationService] WebSocket not available — notification saved to DB only');
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
  async notifyTaskAssigned(userId: string, taskName: string, taskNameEn: string, projectId?: string): Promise<void> {
    await this.create({
      userId,
      type: 'TASK_DUE',
      titleAr: 'مهمة جديدة',
      titleEn: 'New Task',
      messageAr: `تم تعيين مهمة "${taskName}" لك`,
      messageEn: `Task "${taskNameEn}" has been assigned to you`,
      projectId,
      priority: 'MEDIUM',
    });
  }

  /**
   * Notify user of overdue task
   */
  async notifyTaskOverdue(userId: string, taskName: string, taskNameEn: string, projectId?: string): Promise<void> {
    await this.create({
      userId,
      type: 'TASK_DUE',
      titleAr: 'مهمة متأخرة',
      titleEn: 'Overdue Task',
      messageAr: `المهمة "${taskName}" تجاوزت الموعد المحدد`,
      messageEn: `Task "${taskNameEn}" has passed its due date`,
      projectId,
      priority: 'HIGH',
    });
  }

  /**
   * Notify user of invoice overdue
   */
  async notifyInvoiceOverdue(userId: string, invoiceNumber: string, projectId?: string): Promise<void> {
    await this.create({
      userId,
      type: 'INVOICE_OVERDUE',
      titleAr: 'فاتورة متأخرة',
      titleEn: 'Overdue Invoice',
      messageAr: `الفاتورة ${invoiceNumber} تجاوزت تاريخ الاستحقاق`,
      messageEn: `Invoice ${invoiceNumber} has passed its due date`,
      projectId,
      priority: 'HIGH',
    });
  }

  /**
   * Notify user of approval required
   */
  async notifyApprovalRequired(userId: string, approvalType: string, approvalTypeEn: string, projectId?: string): Promise<void> {
    await this.create({
      userId,
      type: 'APPROVAL_NEEDED',
      titleAr: 'موافقة مطلوبة',
      titleEn: 'Approval Required',
      messageAr: `يحتاج "${approvalType}" موافقتك`,
      messageEn: `"${approvalTypeEn}" requires your approval`,
      projectId,
      priority: 'HIGH',
    });
  }

  /**
   * Notify user of meeting reminder
   */
  async notifyMeetingReminder(userId: string, meetingTitle: string, meetingTitleEn: string): Promise<void> {
    await this.create({
      userId,
      type: 'SYSTEM_ALERT',
      titleAr: 'تذكير اجتماع',
      titleEn: 'Meeting Reminder',
      messageAr: `اجتماع "${meetingTitle}" خلال 15 دقيقة`,
      messageEn: `Meeting "${meetingTitleEn}" starts in 15 minutes`,
      priority: 'URGENT',
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
