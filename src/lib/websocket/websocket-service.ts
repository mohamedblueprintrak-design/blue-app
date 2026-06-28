/**
 * WebSocket Service (Server-Side)
 *
 * This module provides server-side functions to push real-time events to
 * the standalone chat-service (mini-services/chat-service on port 3003).
 *
 * Architecture:
 *   Next.js API route → sendNotificationToUser() → postToChatService()
 *     → HTTP POST to chat-service:3003/api/broadcast
 *       → chat-service emits via Socket.io to connected browsers
 *
 * The old initializeWebSocket() function (in-process Socket.io server) was
 * removed — it's incompatible with Next.js App Router (no access to the
 * HTTP server instance). The standalone chat-service handles all Socket.io
 * connections.
 *
 * Client-side: SafeWebSocketProvider in app/layout.tsx connects browsers
 * to the chat-service via socket.io-client with XTransformPort=3003.
 */

import { log } from '@/lib/logger';
import type {
  NotificationPayload,
  ProjectPayload,
  TaskPayload,
} from './types';

// ============================================
// Chat Service HTTP Bridge
// ============================================

/**
 * Post an event to the standalone chat-service for broadcasting to clients.
 * The chat-service validates the INTERNAL_API_SECRET and emits via Socket.io.
 */
async function postToChatService(body: Record<string, unknown>): Promise<void> {
  const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3003';
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret) {
    log.warn(
      '[WebSocket Service] INTERNAL_API_SECRET is not configured — real-time broadcast disabled. ' +
      'Set INTERNAL_API_SECRET to enable chat-service event forwarding.'
    );
    return;
  }

  try {
    const res = await fetch(`${chatServiceUrl}/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalSecret}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      log.error(`[WebSocket Service] HTTP error from chat-service: ${res.status}`);
    }
  } catch (err) {
    log.error('[WebSocket Service] Failed to send broadcast to chat-service:', err);
  }
}

// ============================================
// Public API — Broadcasting Functions
// ============================================

/**
 * Send a notification to a specific user via the chat-service.
 * The chat-service will emit 'notification' to the user's personal room.
 */
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload
): Promise<void> {
  await postToChatService({
    type: 'user',
    userId,
    event: 'notification',
    payload: notification,
  });

  // Also update notification count
  await postToChatService({
    type: 'user',
    userId,
    event: 'notification_count_update',
    payload: { userId },
  });
}

/**
 * Send a notification to all users in an organization.
 * The chat-service will emit the event to the organization room.
 */
export async function sendNotificationToOrganization(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  await postToChatService({
    type: 'organization',
    organizationId,
    event,
    payload,
  });
}

/**
 * Broadcast a project update to all users in the organization.
 */
export async function broadcastProjectUpdate(
  organizationId: string,
  payload: ProjectPayload
): Promise<void> {
  await postToChatService({
    type: 'organization',
    organizationId,
    event: 'project_update',
    payload,
  });
}

/**
 * Broadcast a task update to the organization and the assigned user.
 */
export async function broadcastTaskUpdate(
  organizationId: string,
  _userId: string,
  payload: TaskPayload
): Promise<void> {
  if (organizationId) {
    await postToChatService({
      type: 'organization',
      organizationId,
      event: 'task_update',
      payload,
    });
  }

  if (payload.assignedTo) {
    await postToChatService({
      type: 'user',
      userId: payload.assignedTo,
      event: 'task_update',
      payload,
    });
  }
}

/**
 * Broadcast a system alert to all users in an organization.
 */
export function broadcastSystemAlert(
  organizationId: string,
  payload: { type: string; message: string; severity?: string; [key: string]: unknown }
): void {
  // Fire-and-forget (don't await — system alerts should not block)
  postToChatService({
    type: 'organization',
    organizationId,
    event: 'system_alert',
    payload,
  }).catch((err) => {
    log.error('[WebSocket Service] Failed to broadcast system alert:', err);
  });
}

// ============================================
// Presence (stub — presence is managed by the chat-service)
// ============================================

/**
 * Check if a user is online.
 * Note: This always returns false because presence is tracked by the
 * standalone chat-service, not this module. For real presence data,
 * query the chat-service's presence API (if available).
 */
export function isUserOnline(_userId: string): boolean {
  return false;
}

/**
 * Get online users in an organization.
 * Note: Returns empty array — presence is managed by the chat-service.
 */
export function getOnlineUsersInOrganization(_organizationId: string): string[] {
  return [];
}
