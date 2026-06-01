import webpush from 'web-push';
import { log } from '@/lib/logger';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@blueprint.ae';

let isConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isConfigured = true;
    log.info('[WebPush] VAPID details configured successfully');
  } catch (error) {
    log.error('[WebPush] Failed to configure VAPID details', error);
  }
} else {
  log.warn('[WebPush] VAPID keys not configured. Push notifications will be disabled.');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    link?: string;
    [key: string]: any;
  };
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
) {
  if (!isConfigured) {
    log.warn('[WebPush] Cannot send push notification: WebPush not configured');
    return false;
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    log.debug(`[WebPush] Push sent successfully to ${subscription.endpoint}`);
    return true;
  } catch (error: any) {
    // If subscription is expired or invalid, return 'delete' so the caller can clean up
    if (error.statusCode === 410 || error.statusCode === 404) {
      log.info(`[WebPush] Subscription expired (status ${error.statusCode}) for endpoint: ${subscription.endpoint}`);
      return 'delete';
    }
    log.error('[WebPush] Failed to send push notification', error);
    return false;
  }
}
