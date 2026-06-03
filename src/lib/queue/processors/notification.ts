/**
 * Notification Job Processor
 *
 * Processes notification jobs from the NOTIFICATION queue.
 * Creates notification records in the database and optionally
 * sends push/email notifications.
 */

import { Job } from 'bullmq';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import type { NotificationType } from '@/types/db-enums';
import type { NotificationPayload } from '@/lib/websocket/types';

/**
 * Notification job data structure
 */
export interface NotificationJobData {
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  link?: string;
  projectId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  relatedEntityType?: string;
  relatedEntityId?: string;
  organizationId?: string;
  // Optional: send additional channels
  sendEmail?: boolean;
  emailSubject?: string;
}

/**
 * Process a notification job.
 *
 * Creates a notification record in the database and attempts
 * real-time delivery via WebSocket.
 */
export async function notificationProcessor(job: Job<NotificationJobData>): Promise<void> {
  const {
    userId,
    type,
    titleAr,
    titleEn,
    messageAr,
    messageEn,
    link,
    projectId,
    priority,
    relatedEntityType,
    relatedEntityId,
    organizationId: _organizationId,
    sendEmail,
    emailSubject,
  } = job.data;

  log.info('[Processor/Notification] Processing notification job', {
    jobId: job.id,
    jobName: job.name,
    userId,
    type,
    attempt: job.attemptsMade + 1,
  });

  // 1. Create notification record in database
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title: titleAr,
        titleEn,
        message: messageAr,
        messageEn,
        link: link || '',
        projectId: projectId || null,
        priority: priority || 'MEDIUM',
        relatedEntityType: relatedEntityType || '',
        relatedEntityId: relatedEntityId || '',
        isRead: false,
      },
    });

    log.info('[Processor/Notification] Notification created in DB', {
      notificationId: notification.id,
      userId,
      type,
    });

    // 2. Try to deliver via WebSocket for real-time notification
    try {
      const { sendNotificationToUser } = await import('@/lib/websocket/websocket-service');
      // Map "MEDIUM" → "NORMAL" for WebSocket payload compatibility
      const wsPriority = (priority === 'MEDIUM' ? 'NORMAL' : priority || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      await sendNotificationToUser(userId, {
        notificationId: notification.id,
        userId,
        type,
        title: titleAr,
        message: messageAr,
        priority: wsPriority,
        timestamp: new Date(),
      } as NotificationPayload);
    } catch {
      // WebSocket not available — notification is still persisted in DB
      log.debug('[Processor/Notification] WebSocket not available — notification saved to DB only');
    }

    // 2b. Try to deliver via Browser/PWA Push Notifications
    try {
      const subscriptions = await db.pushSubscription.findMany({
        where: { userId },
      });

      if (subscriptions.length > 0) {
        const { sendPushNotification } = await import('@/lib/notifications/web-push-helper');
        for (const sub of subscriptions) {
          const result = await sendPushNotification(sub, {
            title: titleAr,
            body: messageAr,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
              link: link || undefined,
            },
          });

          if (result === 'delete') {
            await db.pushSubscription.delete({
              where: { endpoint: sub.endpoint },
            });
            log.info(`[Processor/Notification] Deleted expired push subscription: ${sub.endpoint}`);
          }
        }
      }
    } catch (pushError) {
      log.error('[Processor/Notification] Failed to send push notifications', pushError);
    }
  } catch (error) {
    log.error('[Processor/Notification] Failed to create notification in DB', error, {
      userId,
      type,
    });
    throw error; // Re-throw to trigger retry
  }

  // 3. Optionally send email notification
  if (sendEmail) {
    try {
      // Check user's notification preferences
      const userSettings = await db.notificationSettings.findUnique({
        where: { userId },
      });

      if (userSettings && !userSettings.emailNotifications) {
        log.info('[Processor/Notification] User has email notifications disabled', { userId });
        return;
      }

      // Send email via the email queue
      const { addJob, QUEUES } = await import('@/lib/queue/index');
      const { default: emailTemplates } = await import('@/lib/email-templates');

      // Get user email
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await addJob(QUEUES.EMAIL, 'notification-email', {
          to: user.email,
          subject: emailSubject || titleEn || titleAr,
          html: emailTemplates.notificationEmail({
            name: user.name ?? "",
            title: titleEn || titleAr,
            message: messageEn || messageAr,
            link,
          }),
          text: messageEn || messageAr,
        });

        log.info('[Processor/Notification] Email notification queued', { userId });
      }
    } catch (error) {
      // Email sending failure should not fail the notification job
      log.error('[Processor/Notification] Failed to send email notification', error, { userId });
    }
  }
}
