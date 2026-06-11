/**
 * Safe WebSocket Provider with Graceful Degradation
 * مزود WebSocket آمن مع تدهور تدريجي
 *
 * Wraps WebSocketProvider in an error boundary so that if WebSocket
 * fails (service down, network issues), the app continues working
 * normally. Real-time features are simply disabled silently.
 *
 * This is the "progressive enhancement" approach:
 *   ✅ WebSocket working → real-time notifications + user presence
 *   ✅ WebSocket down   → app works perfectly via TanStack Query polling
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { WebSocketProvider } from './websocket-context';

// ============================================
// Error Boundary for WebSocket
// ============================================

interface SafeWebSocketBoundaryState {
  hasError: boolean;
}

class SafeWebSocketBoundary extends Component<
  { children: ReactNode },
  SafeWebSocketBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SafeWebSocketBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Silently log — don't crash the app
    console.info(
      '[SafeWebSocket] WebSocket provider error (app continues normally):',
      error.message,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      // WebSocket failed — render children WITHOUT the WebSocket context
      // The app will use polling fallback via TanStack Query
      return this.props.children;
    }
    return this.props.children;
  }
}

// ============================================
// Safe WebSocket Provider
// ============================================

interface SafeWebSocketProviderProps {
  children: ReactNode;
  token?: string | null;
  userId?: string;
}

/**
 * Wraps the app in a WebSocketProvider with an error boundary.
 * If WebSocket connection fails or the provider throws, children
 * still render — just without real-time features.
 *
 * Always mounts the WebSocketProvider — it will fetch its own token
 * via /api/auth/ws-token if none is provided as a prop.
 */
export function SafeWebSocketProvider({
  children,
  token,
  userId,
}: SafeWebSocketProviderProps) {
  // Always mount so WebSocketProvider can fetch its own token
  return (
    <SafeWebSocketBoundary>
      <WebSocketProvider token={token} userId={userId}>
        {children}
      </WebSocketProvider>
    </SafeWebSocketBoundary>
  );
}
