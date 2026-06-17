/**
 * WebSocket React Hook
 * Hook للاتصال بـ WebSocket من الـ client
 *
 * Provides real-time updates and notifications
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  NotificationPayload,
  ProjectPayload,
  TaskPayload,
  UserPresencePayload,
  SystemAlertPayload,
  TypingPayload,
} from './types';

// ============================================
// Types
// ============================================

interface UseWebSocketOptions {
  token: string;
  url?: string;
  onNotification?: (notification: NotificationPayload) => void;
  onProjectUpdate?: (update: ProjectPayload) => void;
  onTaskUpdate?: (update: TaskPayload) => void;
  onUserOnline?: (user: UserPresencePayload) => void;
  onUserOffline?: (user: UserPresencePayload) => void;
  onUserTyping?: (typing: TypingPayload) => void;
  onSystemAlert?: (alert: SystemAlertPayload) => void;
  onNotificationCount?: (count: number) => void;
  onError?: (error: { message: string; code?: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  notificationCount: number;
  joinOrganization: (organizationId: string) => void;
  leaveOrganization: (organizationId: string) => void;
  subscribeToEntity: (entityType: string, entityId: string) => void;
  unsubscribeFromEntity: (entityType: string, entityId: string) => void;
  startTyping: (entityType: string, entityId: string) => void;
  stopTyping: (entityType: string, entityId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  disconnect: () => void;
}

// ============================================
// Hook
// ============================================

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    token,
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '',
    onNotification,
    onProjectUpdate,
    onTaskUpdate,
    onUserOnline,
    onUserOffline,
    onUserTyping,
    onSystemAlert,
    onNotificationCount,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const isDev = process.env.NODE_ENV === 'development';

  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({
    onNotification,
    onProjectUpdate,
    onTaskUpdate,
    onUserOnline,
    onUserOffline,
    onUserTyping,
    onSystemAlert,
    onNotificationCount,
    onError,
    onConnect,
    onDisconnect,
  });
  // Update callbacks ref inside useEffect to avoid "Cannot update ref during render" error
  useEffect(() => {
    callbacksRef.current = {
      onNotification,
      onProjectUpdate,
      onTaskUpdate,
      onUserOnline,
      onUserOffline,
      onUserTyping,
      onSystemAlert,
      onNotificationCount,
      onError,
      onConnect,
      onDisconnect,
    };
  });
  const [isConnected, setIsConnected] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    if (!token || !url) return;

    // Use XTransformPort query param for Caddy gateway routing to mini-service on port 3003
    const socketUrl = url || '/';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Caddy gateway forwards to port 3003 via this query param
      query: { XTransformPort: '3003' },
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      if (isDev) console.info('[WebSocket] Connected');
      setIsConnected(true);
      callbacksRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason: string) => {
      if (isDev) console.info('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
      callbacksRef.current.onDisconnect?.();
    });

    socket.on('connect_error', (error: Error) => {
      if (isDev) console.error('[WebSocket] Connection error:', error);
      callbacksRef.current.onError?.({ message: error.message, code: 'CONNECTION_ERROR' });
    });

    // Notification events
    socket.on('notification', (data: NotificationPayload) => {
      if (isDev) console.info('[WebSocket] Notification received:', data);
      setNotificationCount((prev) => prev + 1);
      callbacksRef.current.onNotification?.(data);
    });

    socket.on('notification_count', (data: { count: number }) => {
      setNotificationCount(data.count);
      callbacksRef.current.onNotificationCount?.(data.count);
    });

    // Project events
    socket.on('project_update', (data: ProjectPayload) => {
      if (isDev) console.info('[WebSocket] Project update:', data);
      callbacksRef.current.onProjectUpdate?.(data);
    });

    // Task events
    socket.on('task_update', (data: TaskPayload) => {
      if (isDev) console.info('[WebSocket] Task update:', data);
      callbacksRef.current.onTaskUpdate?.(data);
    });

    // User presence events
    socket.on('user_online', (data: UserPresencePayload) => {
      callbacksRef.current.onUserOnline?.(data);
    });

    socket.on('user_offline', (data: UserPresencePayload) => {
      callbacksRef.current.onUserOffline?.(data);
    });

    // Typing events
    socket.on('user_typing', (data: TypingPayload) => {
      callbacksRef.current.onUserTyping?.(data);
    });

    // System events
    socket.on('system_alert', (data: SystemAlertPayload) => {
      if (isDev) console.info('[WebSocket] System alert:', data);
      callbacksRef.current.onSystemAlert?.(data);
    });

    // Error events
    socket.on('error', (data: { message: string; code?: string }) => {
      if (isDev) console.error('[WebSocket] Error:', data);
      callbacksRef.current.onError?.(data);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // isDev is derived from NODE_ENV which never changes at runtime — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, url]);

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
    // Optimistic update
    setNotificationCount((prev) => Math.max(0, prev - 1));

    // Emit socket event outside the state updater to avoid side effects in updater
    socketRef.current?.emit('mark_notification_read', notificationId, (response?: { error?: string }) => {
      if (response?.error) {
        // Rollback on error
        setNotificationCount((prev) => prev + 1);
        callbacksRef.current.onError?.({ message: response.error, code: 'MARK_READ_FAILED' });
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    notificationCount,
    joinOrganization,
    leaveOrganization,
    subscribeToEntity,
    unsubscribeFromEntity,
    startTyping,
    stopTyping,
    markNotificationRead,
    disconnect,
  };
}

// ============================================
// Singleton WebSocket Provider Hook
// ============================================

let globalSocketRef: Socket | null = null;
let globalSocketConsumerCount = 0;

export function useGlobalWebSocket(token?: string): {
  socket: Socket | null;
  isConnected: boolean;
} {
  const [isConnected, setIsConnected] = useState(false);
  const prevTokenRef = useRef(token);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '';

    // Increment consumer count on mount
    globalSocketConsumerCount++;

    // If token was cleared (logout), disconnect the global socket
    if (!token && prevTokenRef.current) {
      if (globalSocketRef) {
        globalSocketRef.disconnect();
        globalSocketRef = null;
      }
      prevTokenRef.current = token;
      return () => {
        globalSocketConsumerCount--;
      };
    }

    if (!token) {
      return () => {
        globalSocketConsumerCount--;
      };
    }

    // If token changed (re-login or refresh), disconnect old and reconnect
    if (prevTokenRef.current && prevTokenRef.current !== token) {
      if (globalSocketRef) {
        globalSocketRef.disconnect();
        globalSocketRef = null;
      }
    }

    if (!globalSocketRef) {
      const socketUrl = url || '/';
      globalSocketRef = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        // Caddy gateway forwards to port 3003 via this query param
        query: { XTransformPort: '3003' },
      });
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    globalSocketRef.on('connect', onConnect);
    globalSocketRef.on('disconnect', onDisconnect);

    // Sync initial connection state asynchronously to avoid linting error
    if (globalSocketRef) {
      const isSocketConnected = globalSocketRef.connected;
      Promise.resolve().then(() => {
        setIsConnected(isSocketConnected);
      });
    }

    prevTokenRef.current = token;

    return () => {
      globalSocketConsumerCount--;
      if (globalSocketRef) {
        globalSocketRef.off('connect', onConnect);
        globalSocketRef.off('disconnect', onDisconnect);
        // Only disconnect when no more consumers remain
        if (globalSocketConsumerCount <= 0) {
          globalSocketConsumerCount = 0;
          globalSocketRef.disconnect();
          globalSocketRef = null;
        }
      }
    };
  }, [token]);

  // Derive connection state: without a token, never report connected
  const effectiveIsConnected = token ? isConnected : false;

  return { socket: globalSocketRef, isConnected: effectiveIsConnected };
}
