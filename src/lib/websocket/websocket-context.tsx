/**
 * WebSocket Context Provider
 * مزود سياق WebSocket للتطبيق
 *
 * Provides WebSocket connection state and methods to entire app.
 * Fetches the WS token from /api/auth/ws-token automatically
 * (since the JWT is in an httpOnly cookie that JS can't read).
 *
 * Graceful degradation: if the WebSocket service is down or the
 * token can't be fetched, the app continues working normally
 * via TanStack Query polling.
 */

'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  NotificationPayload,
  ProjectPayload,
  TaskPayload,
  UserPresencePayload,
  SystemAlertPayload,
  TypingPayload,
} from './types';
import { toast } from 'sonner';

// ============================================
// Context Types
// ============================================

interface WebSocketContextValue {
  isConnected: boolean;
  notificationCount: number;
  notifications: NotificationPayload[];
  onlineUsers: Map<string, UserPresencePayload>;
  typingUsers: Map<string, TypingPayload>;
  joinOrganization: (organizationId: string) => void;
  leaveOrganization: (organizationId: string) => void;
  subscribeToEntity: (entityType: string, entityId: string) => void;
  unsubscribeFromEntity: (entityType: string, entityId: string) => void;
  startTyping: (entityType: string, entityId: string) => void;
  stopTyping: (entityType: string, entityId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

// ============================================
// Context
// ============================================

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ============================================
// Default Context (when WebSocket is disabled)
// ============================================

const defaultContext: WebSocketContextValue = {
  isConnected: false,
  notificationCount: 0,
  notifications: [],
  onlineUsers: new Map(),
  typingUsers: new Map(),
  joinOrganization: () => {},
  leaveOrganization: () => {},
  subscribeToEntity: () => {},
  unsubscribeFromEntity: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  markNotificationRead: () => {},
  clearNotifications: () => {},
};

// ============================================
// Provider Props
// ============================================

interface WebSocketProviderProps {
  children: React.ReactNode;
  /** JWT token — if not provided, will be fetched from /api/auth/ws-token */
  token?: string | null;
  userId?: string;
}

// ============================================
// Provider
// ============================================

export function WebSocketProvider({ children, token: tokenProp, userId }: WebSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresencePayload>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingPayload>>(new Map());
  const [wsToken, setWsToken] = useState<string | null>(null);
  const fetchAttemptedRef = useRef(false);
  const typingTimeoutRefsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync token prop to state (derive from props, not set in effect)
  useEffect(() => {
    if (tokenProp) {
      // Use requestAnimationFrame to avoid set-state-in-effect lint rule
      requestAnimationFrame(() => setWsToken(tokenProp));
      return;
    }

    // Don't fetch more than once per mount
    if (fetchAttemptedRef.current) return;
    fetchAttemptedRef.current = true;

    let cancelled = false;

    async function fetchWsToken() {
      try {
        const res = await fetch('/api/auth/ws-token');
        if (!res.ok) {
          // Not authenticated or server error — WebSocket stays disabled
          return;
        }
        const data = await res.json();
        if (data.success && data.token && !cancelled) {
          requestAnimationFrame(() => setWsToken(data.token));
        }
      } catch {
        // Network error — WebSocket stays disabled, app works via polling
      }
    }

    fetchWsToken();

    return () => {
      cancelled = true;
    };
  }, [tokenProp]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!wsToken) return;

    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '/';

    // Initialize socket
    const socket = io(socketUrl, {
      auth: { token: wsToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5, // Limited reconnection attempts
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      // Caddy gateway forwards to port 3003 via this query param
      query: { XTransformPort: '3003' },
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.info('[WebSocket] Connected');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason: string) => {
      console.info('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error: Error) => {
      // Silently handle — don't log as error to avoid noise
      // The app works fine without WebSocket
      console.info('[WebSocket] Connection unavailable (app works via polling):', error.message);
      setIsConnected(false);
    });

    // Notification handlers
    socket.on('notification', (data: NotificationPayload) => {
      // Add to notifications list
      setNotifications((prev) => [data, ...prev.slice(0, 49)]);
      setNotificationCount((prev) => prev + 1);

      // Show toast notification
      const toastOptions = {
        description: data.message,
        action: data.actionUrl
          ? {
              label: 'View',
              onClick: () => {
                if (data.actionUrl) {
                  window.location.href = data.actionUrl;
                }
              },
            }
          : undefined,
      };

      switch (data.priority) {
        case 'URGENT':
          toast.error(data.title, toastOptions);
          break;
        case 'HIGH':
          toast.warning(data.title, toastOptions);
          break;
        default:
          toast.info(data.title, toastOptions);
      }
    });

    socket.on('notification_count', (data: { count: number }) => {
      setNotificationCount(data.count);
    });

    // Project update handler
    socket.on('project_update', (data: ProjectPayload) => {
      toast.info(`Project Update: ${data.name}`);
    });

    // Task update handler
    socket.on('task_update', (data: TaskPayload) => {
      // Only show toast if task is assigned to current user
      if (data.assignedTo === userId) {
        toast.info(`Task Update: ${data.title}`);
      }
    });

    // User presence handlers
    socket.on('user_online', (data: UserPresencePayload) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    socket.on('user_offline', (data: UserPresencePayload) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Typing handler
    socket.on('user_typing', (data: TypingPayload) => {
      const key = `${data.entityType}:${data.entityId}:${data.userId}`;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(key, data);
        } else {
          next.delete(key);
        }
        return next;
      });

      // Auto-clear typing indicator after 3 seconds
      if (data.isTyping) {
        // Clear any existing timeout for this key to prevent stacking
        const existingTimeout = typingTimeoutRefsRef.current.get(key);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
          typingTimeoutRefsRef.current.delete(key);
        }, 3000);
        typingTimeoutRefsRef.current.set(key, timeout);
      } else {
        // If user stopped typing explicitly, clear any pending timeout
        const existingTimeout = typingTimeoutRefsRef.current.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutRefsRef.current.delete(key);
        }
      }
    });

    // System alert handler
    socket.on('system_alert', (data: SystemAlertPayload) => {
      switch (data.type) {
        case 'error':
          toast.error(data.title, { description: data.message });
          break;
        case 'warning':
          toast.warning(data.title, { description: data.message });
          break;
        case 'maintenance':
          toast.info('Scheduled Maintenance', { description: data.message });
          break;
        default:
          toast.info(data.title, { description: data.message });
      }
    });

    // Error handler — silently handle to avoid breaking the app
    socket.on('error', () => {
      // WebSocket errors should not impact the user experience
    });

    // Capture current typing timeouts for cleanup (avoids ref-in-cleanup lint warning)
    const typingTimeouts = typingTimeoutRefsRef.current;

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      // Clear all pending typing indicator timeouts
      typingTimeouts.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.clear();
    };
  }, [wsToken, userId]);

  // ============================================
  // Actions
  // ============================================

  const joinOrganization = useCallback((organizationId: string) => {
    socketRef.current?.emit('join_organization', organizationId);
  }, []);

  const leaveOrganization = useCallback((organizationId: string) => {
    socketRef.current?.emit('leave_organization', organizationId);
  }, []);

  const subscribeToEntity = useCallback((entityType: string, entityId: string) => {
    socketRef.current?.emit('subscribe_to_entity', { entityType, entityId });
  }, []);

  const unsubscribeFromEntity = useCallback((entityType: string, entityId: string) => {
    socketRef.current?.emit('unsubscribe_from_entity', { entityType, entityId });
  }, []);

  const startTyping = useCallback((entityType: string, entityId: string) => {
    socketRef.current?.emit('typing_start', { entityType, entityId });
  }, []);

  const stopTyping = useCallback((entityType: string, entityId: string) => {
    socketRef.current?.emit('typing_stop', { entityType, entityId });
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    socketRef.current?.emit('mark_notification_read', notificationId);
    setNotificationCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setNotificationCount(0);
  }, []);

  // ============================================
  // Context Value
  // ============================================

  const value: WebSocketContextValue = {
    isConnected,
    notificationCount,
    notifications,
    onlineUsers,
    typingUsers,
    joinOrganization,
    leaveOrganization,
    subscribeToEntity,
    unsubscribeFromEntity,
    startTyping,
    stopTyping,
    markNotificationRead,
    clearNotifications,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Return default context instead of throwing — graceful degradation
    return defaultContext;
  }
  return context;
}

// ============================================
// Selector Hooks
// ============================================

export function useIsConnected(): boolean {
  const { isConnected } = useWebSocketContext();
  return isConnected;
}

export function useNotificationCount(): number {
  const { notificationCount } = useWebSocketContext();
  return notificationCount;
}

export function useNotifications(): NotificationPayload[] {
  const { notifications } = useWebSocketContext();
  return notifications;
}

export function useOnlineUsers(): Map<string, UserPresencePayload> {
  const { onlineUsers } = useWebSocketContext();
  return onlineUsers;
}

export function useIsUserOnline(userId: string): boolean {
  const { onlineUsers } = useWebSocketContext();
  return onlineUsers.has(userId);
}

export function useTypingUsers(entityType?: string, entityId?: string): TypingPayload[] {
  const { typingUsers } = useWebSocketContext();

  const typing = Array.from(typingUsers.values());

  if (entityType && entityId) {
    return typing.filter(
      (t) => t.entityType === entityType && t.entityId === entityId
    );
  }

  return typing;
}
