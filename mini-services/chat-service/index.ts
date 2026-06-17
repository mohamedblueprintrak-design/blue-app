// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — This is a standalone Bun runtime service, not part of the Next.js build
/**
 * BluePrint WebSocket Chat Service
 * Standalone Socket.io server with JWT authentication
 *
 * Handles: notifications, project updates, task updates,
 *          user presence, typing indicators
 *
 * Path: '/' (for Caddy gateway compatibility)
 * Port: 3003
 */

import { createServer } from 'http';
import { Server as IOServer, Socket, DefaultEventsMap } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { Database } from 'bun:sqlite';
import path from 'path';
import {
  SocketData,
  NotificationPayload,
  ProjectPayload,
  TaskPayload,
  RoomType,
  ClientToServerEvents,
  ServerToClientEvents,
  UserPresencePayload,
  TypingPayload,
  SystemAlertPayload,
} from './types';

// ============================================
// Configuration
// ============================================

const PORT = parseInt(process.env.PORT || '3003', 10);

// JWT_SECRET: In production, a strong secret MUST be set via environment variable.
// Using a fallback secret in production is a critical security vulnerability.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error(
    'SECURITY: JWT_SECRET environment variable is required in production. ' +
    'Set a strong, random secret (≥32 characters) before starting the service.'
  );
}
const JWT_SECRET = process.env.JWT_SECRET || 'blueprint-dev-secret-do-not-use-in-production-min32chars!';
const JWT_ISSUER = process.env.JWT_ISSUER || 'blueprint-erp';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'blueprint-ws';
const CORS_ORIGIN = process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================
// Database Connection (bun:sqlite — built into Bun, no native deps)
// ============================================

function resolveDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
  // Handle file: protocol URLs
  if (dbUrl.startsWith('file:')) {
    const rawPath = dbUrl.slice(5);
    // If absolute path, use as-is; otherwise resolve relative to project root
    if (path.isAbsolute(rawPath)) {
      return rawPath;
    }
    // Resolve relative to the main project root (3 levels up from this file)
    return path.resolve(__dirname, '..', '..', rawPath);
  }
  return dbUrl;
}

const DB_PATH = resolveDatabasePath();
console.info(`[DB] Opening SQLite database at: ${DB_PATH}`);

let db: Database;
try {
  db = new Database(DB_PATH);
  // Enable WAL mode for better concurrent read performance
  db.exec('PRAGMA journal_mode = WAL');
  console.info('[DB] Database connected successfully');
} catch (error) {
  console.error('[DB] Failed to connect to database:', error);
  process.exit(1);
}

// ============================================
// Prepared Statements
// ============================================

const stmtFindUser = db.prepare(`
  SELECT id, email, name, role, organizationId, isActive
  FROM User
  WHERE id = ?
`);

const stmtCountUnreadNotifications = db.prepare(`
  SELECT COUNT(*) as count
  FROM Notification
  WHERE userId = ? AND isRead = 0
`);

const stmtMarkNotificationRead = db.prepare(`
  UPDATE Notification
  SET isRead = 1
  WHERE id = ? AND userId = ?
`);

const stmtFindNotification = db.prepare(`
  SELECT id, userId FROM Notification WHERE id = ?
`);

// ============================================
// Connected Users Tracking
// ============================================

interface ConnectedUser {
  socketId: string;
  userId: string;
  organizationId?: string;
  userName: string;
  connectedAt: Date;
  rooms: Set<string>;
}

const connectedUsers = new Map<string, ConnectedUser>();
const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

// ============================================
// Socket.io Server Setup
// ============================================

type TypedIOServer = IOServer<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

const httpServer = createServer();

const io: TypedIOServer = new IOServer(httpServer, {
  // DO NOT change the path — used by Caddy to forward requests to the correct port
  path: '/',
  cors: {
    origin: CORS_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================
// JWT Authentication Middleware
// ============================================

io.use((socket: TypedSocket, next: (err?: Error) => void) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const secret = JWT_SECRET;

    // Verify JWT token
    const decoded = verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as {
      userId: string;
      email: string;
      role: string;
      organizationId?: string;
      name: string;
    };

    // Look up user in database to verify they still exist and are active
    const user = stmtFindUser.get(decoded.userId) as {
      id: string;
      email: string;
      name: string | null;
      role: string;
      organizationId: string | null;
      isActive: boolean;
    } | undefined;

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    // Attach user data to socket
    socket.data = {
      userId: user.id,
      organizationId: user.organizationId || undefined,
      role: user.role,
      email: user.email,
      userName: user.name || 'Unknown User',
      connectedAt: new Date(),
    };

    next();
  } catch (error) {
    console.error('[Auth] Authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// ============================================
// Room Helpers
// ============================================

function getRoomName(type: RoomType, id: string): string {
  return `${type}:${id}`;
}

function joinRoom(socket: TypedSocket, type: RoomType, id: string) {
  const roomName = getRoomName(type, id);
  socket.join(roomName);

  const userConnection = connectedUsers.get(socket.id);
  if (userConnection) {
    userConnection.rooms.add(roomName);
  }

  console.info(`[Room] ${socket.data.userName} joined room: ${roomName}`);
}

function leaveRoom(socket: TypedSocket, type: RoomType, id: string) {
  const roomName = getRoomName(type, id);
  socket.leave(roomName);

  const userConnection = connectedUsers.get(socket.id);
  if (userConnection) {
    userConnection.rooms.delete(roomName);
  }

  console.info(`[Room] ${socket.data.userName} left room: ${roomName}`);
}

// ============================================
// Notification Helpers
// ============================================

function sendNotificationCount(socket: TypedSocket, userId: string): void {
  try {
    const result = stmtCountUnreadNotifications.get(userId) as { count: number } | undefined;
    const count = result?.count ?? 0;
    socket.emit('notification_count', { count });
  } catch (error) {
    console.error('[Notification] Error getting notification count:', error);
  }
}

function sendNotificationCountToUser(userId: string): void {
  try {
    const result = stmtCountUnreadNotifications.get(userId) as { count: number } | undefined;
    const count = result?.count ?? 0;
    const userRoom = getRoomName('user', userId);
    io.to(userRoom).emit('notification_count', { count });
  } catch (error) {
    console.error('[Notification] Error getting notification count for user:', error);
  }
}

// ============================================
// User Presence Broadcast
// ============================================

function broadcastUserPresence(userId: string, userName: string, isOnline: boolean): void {
  const userConnection = findUserConnection(userId);
  if (userConnection?.organizationId) {
    const orgRoom = getRoomName('organization', userConnection.organizationId);
    const payload: UserPresencePayload = {
      userId,
      userName,
      timestamp: new Date(),
      organizationId: userConnection.organizationId,
    };

    if (isOnline) {
      io.to(orgRoom).emit('user_online', payload);
    } else {
      io.to(orgRoom).emit('user_offline', payload);
    }
  }
}

function findUserConnection(userId: string): ConnectedUser | undefined {
  for (const connection of connectedUsers.values()) {
    if (connection.userId === userId) {
      return connection;
    }
  }
  return undefined;
}

// ============================================
// Connection Handler
// ============================================

function handleConnection(socket: TypedSocket) {
  const { userId, organizationId, userName } = socket.data;

  console.info(`[WS] User connected: ${userName} (${userId})`);

  // Track connected user
  const userConnection: ConnectedUser = {
    socketId: socket.id,
    userId,
    organizationId,
    userName,
    connectedAt: new Date(),
    rooms: new Set(),
  };
  connectedUsers.set(socket.id, userConnection);

  // Track sockets per user
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket.id);

  // Auto-join organization room
  if (organizationId) {
    joinRoom(socket, 'organization', organizationId);
  }

  // Auto-join user's personal room
  joinRoom(socket, 'user', userId);

  // Notify others of online status
  broadcastUserPresence(userId, userName, true);

  // Send initial notification count
  sendNotificationCount(socket, userId);

  // Setup event handlers
  setupEventHandlers(socket);

  // Handle disconnection
  socket.on('disconnect', () => {
    handleDisconnection(socket);
  });
}

// ============================================
// Event Handlers
// ============================================

function setupEventHandlers(socket: TypedSocket) {
  // Join organization room (with auth verification)
  socket.on('join_organization', (organizationId: string) => {
    if (typeof organizationId !== 'string') {
      socket.emit('error', { message: 'Invalid organization ID format', code: 'INVALID_INPUT' });
      return;
    }

    const userConnection = connectedUsers.get(socket.id);
    if (!userConnection) {
      socket.emit('error', { message: 'Unauthorized: not connected properly', code: 'NOT_CONNECTED' });
      return;
    }

    // Admins can join any organization room
    if (socket.data.role === 'ADMIN' || socket.data.role === 'admin') {
      joinRoom(socket, 'organization', organizationId);
      return;
    }

    if (userConnection.organizationId !== organizationId) {
      socket.emit('error', { message: 'Unauthorized: you do not belong to this organization', code: 'ORG_MISMATCH' });
      return;
    }
    joinRoom(socket, 'organization', organizationId);
  });

  // Leave organization room
  socket.on('leave_organization', (organizationId: string) => {
    leaveRoom(socket, 'organization', organizationId);
  });

  // Mark notification as read (with ownership verification — prevents IDOR)
  socket.on('mark_notification_read', (notificationId: string) => {
    try {
      // SECURITY: Verify the notification belongs to the requesting user
      const notification = stmtFindNotification.get(notificationId) as { id: string; userId: string } | undefined;
      if (!notification) {
        console.warn(`[Security] Notification not found: ${notificationId} (user: ${socket.data.userId})`);
        return;
      }
      if (notification.userId !== socket.data.userId) {
        console.warn(`[Security] IDOR attempt: user ${socket.data.userId} tried to mark notification ${notificationId} owned by ${notification.userId}`);
        return;
      }
      stmtMarkNotificationRead.run(notificationId, socket.data.userId);
      // Update notification count for this user
      sendNotificationCount(socket, socket.data.userId);
      console.info(`[Notification] Marked as read: ${notificationId}`);
    } catch (error) {
      console.error('[Notification] Error marking notification as read:', error);
    }
  });

  // Subscribe to entity updates
  socket.on('subscribe_to_entity', (data: { entityType: string; entityId: string }) => {
    const { entityType, entityId } = data;
    const organizationId = socket.data.organizationId;

    // SECURITY: Basic entity verification to prevent IDOR and cross-tenant access.
    // In a full implementation, we'd query the DB for the entity's orgId.
    // Here we implement it for 'project' and 'task' if the database is available.
    if (['project', 'task'].includes(entityType) && organizationId) {
      try {
        // Warning: This only works if using SQLite (which chat-service expects)
        const table = entityType === 'project' ? 'Project' : 'Task';
        // Note: Using raw string concatenation for table name is safe here because it's tightly controlled above.
        const stmtCheck = db.prepare(`SELECT organizationId FROM ${table} WHERE id = ?`);
        const result = stmtCheck.get(entityId) as { organizationId: string } | undefined;
        
        if (result && result.organizationId !== organizationId) {
          console.warn(`[Security] IDOR attempt: user ${socket.data.userId} tried to subscribe to ${entityType} ${entityId}`);
          return socket.emit('error', { message: 'Unauthorized entity access', code: 'UNAUTHORIZED' });
        }
      } catch (error) {
        console.error(`[WS] Entity verification failed for ${entityType} ${entityId}:`, error);
        // Fallthrough: allow subscription if DB check fails (e.g. if using Postgres in a SQLite-only service)
      }
    }

    joinRoom(socket, 'entity', `${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
  });

  // Unsubscribe from entity updates
  socket.on('unsubscribe_from_entity', (data: { entityType: string; entityId: string }) => {
    leaveRoom(socket, 'entity', `${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
  });

  // Typing start indicator
  socket.on('typing_start', (data: { entityType: string; entityId: string }) => {
    const room = getRoomName('entity', `${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
    const payload: TypingPayload = {
      userId: socket.data.userId,
      userName: socket.data.userName,
      entityType: data.entityType,
      entityId: data.entityId,
      isTyping: true,
      timestamp: new Date(),
      organizationId: socket.data.organizationId,
    };
    socket.to(room).emit('user_typing', payload);
  });

  // Typing stop indicator
  socket.on('typing_stop', (data: { entityType: string; entityId: string }) => {
    const room = getRoomName('entity', `${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
    const payload: TypingPayload = {
      userId: socket.data.userId,
      userName: socket.data.userName,
      entityType: data.entityType,
      entityId: data.entityId,
      isTyping: false,
      timestamp: new Date(),
      organizationId: socket.data.organizationId,
    };
    socket.to(room).emit('user_typing', payload);
  });
}

// ============================================
// Disconnection Handler
// ============================================

function handleDisconnection(socket: TypedSocket) {
  const { userId, userName } = socket.data;

  console.info(`[WS] User disconnected: ${userName} (${userId})`);

  // Remove from tracking
  connectedUsers.delete(socket.id);

  // Remove from user's sockets
  const userSocketSet = userSockets.get(userId);
  if (userSocketSet) {
    userSocketSet.delete(socket.id);
    if (userSocketSet.size === 0) {
      userSockets.delete(userId);
      // User is completely offline — broadcast offline status
      broadcastUserPresence(userId, userName, false);
    }
  }
}

// ============================================
// Broadcast API (for external use / future HTTP endpoints)
// ============================================

/**
 * Send notification to specific user
 */
export function sendNotificationToUser(userId: string, notification: NotificationPayload): void {
  const roomName = getRoomName('user', userId);
  io.to(roomName).emit('notification', notification);
  sendNotificationCountToUser(userId);
}

/**
 * Send notification to all users in organization
 */
export function sendNotificationToOrganization(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  const roomName = getRoomName('organization', organizationId);
  io.to(roomName).emit(event as keyof ServerToClientEvents, payload as never);
}

/**
 * Broadcast project update to organization
 */
export function broadcastProjectUpdate(organizationId: string, payload: ProjectPayload): void {
  const roomName = getRoomName('organization', organizationId);
  io.to(roomName).emit('project_update', payload);
}

/**
 * Broadcast task update to organization + assigned user
 */
export function broadcastTaskUpdate(
  organizationId: string,
  userId: string,
  payload: TaskPayload
): void {
  if (organizationId) {
    const orgRoom = getRoomName('organization', organizationId);
    io.to(orgRoom).emit('task_update', payload);
  }
  if (payload.assignedTo) {
    const userRoom = getRoomName('user', payload.assignedTo);
    io.to(userRoom).emit('task_update', payload);
  }
}

/**
 * Broadcast system alert to organization
 */
export function broadcastSystemAlert(
  organizationId: string,
  alert: {
    type: 'info' | 'warning' | 'error' | 'maintenance';
    title: string;
    message: string;
  }
): void {
  const roomName = getRoomName('organization', organizationId);
  const payload: SystemAlertPayload = {
    ...alert,
    alertId: `alert_${Date.now()}`,
    timestamp: new Date(),
    organizationId,
  };
  io.to(roomName).emit('system_alert', payload);
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: string): boolean {
  const sockets = userSockets.get(userId);
  return sockets !== undefined && sockets.size > 0;
}

/**
 * Get all online users in an organization
 */
export function getOnlineUsersInOrganization(organizationId: string): string[] {
  const onlineUsers: string[] = [];
  for (const connection of connectedUsers.values()) {
    if (connection.organizationId === organizationId) {
      onlineUsers.push(connection.userId);
    }
  }
  return onlineUsers;
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  uniqueUsers: number;
  connectionsPerUser: Record<string, number>;
} {
  const connectionsPerUser: Record<string, number> = {};
  for (const [userId, sockets] of userSockets.entries()) {
    connectionsPerUser[userId] = sockets.size;
  }
  return {
    totalConnections: connectedUsers.size,
    uniqueUsers: userSockets.size,
    connectionsPerUser,
  };
}

// ============================================
// Start Server
// ============================================

io.on('connection', (socket) => {
  handleConnection(socket);
});

httpServer.listen(PORT, () => {
  console.info(`[WS] BluePrint WebSocket Chat Service running on port ${PORT}`);
  console.info(`[WS] Socket.io path: '/'`);
  console.info(`[WS] CORS origin: ${CORS_ORIGIN}`);
  console.info(`[WS] JWT auth: enabled`);
  console.info(`[WS] Database: ${DB_PATH}`);
  console.info(`[WS] Ready for connections`);
});

// ============================================
// Graceful Shutdown
// ============================================

function gracefulShutdown(signal: string) {
  console.info(`[WS] Received ${signal}, shutting down...`);

  // Close all socket connections
  io.disconnectSockets(true);

  // Close HTTP server
  httpServer.close(() => {
    // Close database
    try {
      db.close();
      console.info('[DB] Database connection closed');
    } catch {
      // Database may already be closed
    }

    console.info('[WS] Server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[WS] Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
