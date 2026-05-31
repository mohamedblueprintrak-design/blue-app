/**
 * WebSocket Client Module
 * وحدة WebSocket للإشعارات الفورية (Client-side only)
 *
 * Exports WebSocket client-side functionality (hooks and context).
 * Server-side WebSocket functionality is in websocket-service.ts,
 * imported directly by server code (not through this barrel).
 */

// Types
export * from './types';

// React Hook (client-only)
export { useWebSocket, useGlobalWebSocket } from './use-websocket';

// Context (client-only)
export {
  WebSocketProvider,
  useWebSocketContext,
  useIsConnected,
  useNotificationCount,
  useNotifications,
  useOnlineUsers,
  useIsUserOnline,
  useTypingUsers,
} from './websocket-context';

// Safe Provider with graceful degradation
export { SafeWebSocketProvider } from './safe-websocket-provider';
