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
      console.info('[WebSocket] Connected');
      setIsConnected(true);
      callbacksRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason: string) => {
      console.info('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
      callbacksRef.current.onDisconnect?.();
    });

    socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Connection error:', error);
      callbacksRef.current.onError?.({ message: error.message, code: 'CONNECTION_ERROR' });
    });

    // Notification events
    socket.on('notification', (data: NotificationPayload) => {
      console.info('[WebSocket] Notification received:', data);
      setNotificationCount((prev) => prev + 1);
      callbacksRef.current.onNotification?.(data);
    });

    socket.on('notification_count', (data: { count: number }) => {
      setNotificationCount(data.count);
      callbacksRef.current.onNotificationCount?.(data.count);
    });

    // Project events
    socket.on('project_update', (data: ProjectPayload) => {
      console.info('[WebSocket] Project update:', data);
      callbacksRef.current.onProjectUpdate?.(data);
    });

    // Task events
    socket.on('task_update', (data: TaskPayload) => {
      console.info('[WebSocket] Task update:', data);
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
      console.info('[WebSocket] System alert:', data);
      callbacksRef.current.onSystemAlert?.(data);
    });

    // Error events
    socket.on('error', (data: { message: string; code?: string }) => {
      console.error('[WebSocket] Error:', data);
      callbacksRef.current.onError?.(data);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
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
    socketRef.current?.emit('mark_notification_read', notificationId);
    setNotificationCount((prev) => Math.max(0, prev - 1));
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

let globalSocket: Socket | null = null;

export function useGlobalWebSocket(token?: string): {
  socket: Socket | null;
  isConnected: boolean;
} {
  const [isConnected, setIsConnected] = useState(false);
  const prevTokenRef = useRef(token);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '';

    // If token was cleared (logout), disconnect the global socket
    if (!token && prevTokenRef.current) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      prevTokenRef.current = token;
      return;
    }

    if (!token) return;

    // If token changed (re-login or refresh), disconnect old and reconnect
    if (prevTokenRef.current && prevTokenRef.current !== token) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
    }

    if (!globalSocket) {
      const socketUrl = url || '/';
      globalSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        // Caddy gateway forwards to port 3003 via this query param
        query: { XTransformPort: '3003' },
      });
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    globalSocket.on('connect', onConnect);
    globalSocket.on('disconnect', onDisconnect);

    // Sync initial connection state asynchronously to avoid linting error
    if (globalSocket) {
      const isSocketConnected = globalSocket.connected;
      Promise.resolve().then(() => {
        setIsConnected(isSocketConnected);
      });
    }

    prevTokenRef.current = token;

    return () => {
      if (globalSocket) {
        globalSocket.off('connect', onConnect);
        globalSocket.off('disconnect', onDisconnect);
      }
    };
  }, [token]);

  // Derive connection state: without a token, never report connected
  const effectiveIsConnected = token ? isConnected : false;

  return { socket: globalSocket, isConnected: effectiveIsConnected };
}
