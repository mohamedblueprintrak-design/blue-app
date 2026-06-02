/**
 * WebSocket Service
 * خدمة WebSocket للإشعارات الفورية
 *
 * Implements real-time communication using Socket.io
 * Handles notifications, presence, and live updates
 */

import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import { Server as IOServer, Socket, DefaultEventsMap } from 'socket.io';
import * as jose from 'jose';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import {
  SocketData,
  NotificationPayload,
  ProjectPayload,
  TaskPayload,
  RoomType,
  ClientToServerEvents,
  ServerToClientEvents,
} from './types';

// ============================================
// WebSocket Server Instance
// ============================================

type TypedIOServer = IOServer<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

let io: TypedIOServer | null = null;

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
// Initialize WebSocket Server
// ============================================

export async function initializeWebSocket(
  server: HTTPServer | HTTPSServer,
  corsOrigin?: string | string[]
): Promise<TypedIOServer> {
  if (io) {
    return io;
  }

  // Determine allowed origins — never default to wildcard '*'
  const origin =
    corsOrigin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
  if (!origin) {
    throw new Error(
      '[WebSocket] No CORS origin configured. Set NEXT_PUBLIC_APP_URL or pass corsOrigin explicitly.'
    );
  }

  io = new IOServer(server, {
    cors: {
      origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for multi-instance deployment
  // When REDIS_URL is configured, Socket.io uses Redis as a pub/sub backend
  // so that events broadcast across all server instances
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const { createClient: createRedisClient } = await import('redis');
      
      const pubClient = createRedisClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      
      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      io.adapter(createAdapter(pubClient, subClient));
      log.info('[WebSocket] Redis adapter connected — multi-instance mode enabled');
    } catch (error) {
      log.warn('[WebSocket] Redis adapter failed to initialize — running in single-instance mode:', { error: error instanceof Error ? error.message : String(error) });
      // Continue without Redis adapter — works fine for single instance
    }
  }

  // Authentication middleware
  io.use(async (socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token with issuer/audience validation
      const secretKey = getJwtSecretBytes();
      const { payload: decoded } = await jose.jwtVerify(token, secretKey, {
        issuer: 'blueprint-saas',
        audience: 'blueprint-users',
      });

      // Get user from database
      const user = await db.user.findUnique({
        where: { id: decoded.userId as string },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          isActive: true,
        },
      });

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
      log.error('[WebSocket] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>) => {
    handleConnection(socket);
  });

  return io;
}

// ============================================
// Connection Handler
// ============================================

function handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>) {
  const { userId, organizationId, userName } = socket.data;

  log.info(`[WebSocket] User connected: ${userName} (${userId})`);

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

  // Setup event handlers
  setupEventHandlers(socket);

  // Send initial notification count
  sendNotificationCount(socket, userId);

  // Handle disconnection
  socket.on('disconnect', () => {
    handleDisconnection(socket);
  });
}

// ============================================
// Event Handlers
// ============================================

function setupEventHandlers(socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>) {
  // Join organization room
  socket.on('join_organization', (organizationId: string) => {
    joinRoom(socket, 'organization', organizationId);
  });

  // Leave organization room
  socket.on('leave_organization', (organizationId: string) => {
    leaveRoom(socket, 'organization', organizationId);
  });

  // Mark notification as read (with ownership verification to prevent IDOR)
  socket.on('mark_notification_read', async (notificationId: string) => {
    try {
      // Verify the notification belongs to this user before updating
      const notification = await db.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
      });
      if (!notification || notification.userId !== socket.data.userId) {
        log.warn('[WebSocket] User attempted to modify notification they do not own', {
          userId: socket.data.userId,
          notificationId,
        });
        return;
      }

      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      // Update notification count
      await sendNotificationCount(socket, socket.data.userId);
    } catch (error) {
      log.error('[WebSocket] Error marking notification as read:', error);
    }
  });

  // Subscribe to entity updates — with org-scoped access control
  socket.on('subscribe_to_entity', async (data: { entityType: string; entityId: string }) => {
    try {
      // Enforce org-scoped room to prevent cross-tenant data leaks
      const orgId = socket.data.organizationId;
      if (orgId) {
        // Org-scoped room: only members of the same org can subscribe
        joinRoom(socket, 'entity' as RoomType, `org:${orgId}:${data.entityType}:${data.entityId}`);
      } else {
        // Single-tenant fallback
        joinRoom(socket, 'entity' as RoomType, `${data.entityType}:${data.entityId}`);
      }
    } catch (error) {
      log.error('[WebSocket] Error subscribing to entity:', error);
      socket.emit('error', { message: 'Failed to subscribe', code: 'SUBSCRIBE_ERROR' });
    }
  });

  // Unsubscribe from entity updates
  socket.on('unsubscribe_from_entity', (data: { entityType: string; entityId: string }) => {
    leaveRoom(socket, 'entity' as RoomType, `${data.entityType}:${data.entityId}`);
  });

  // Typing indicators
  socket.on('typing_start', (data: { entityType: string; entityId: string }) => {
    const room = `entity:${data.entityType}:${data.entityId}`;
    socket.to(room).emit('user_typing', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      entityType: data.entityType,
      entityId: data.entityId,
      isTyping: true,
      timestamp: new Date(),
    });
  });

  socket.on('typing_stop', (data: { entityType: string; entityId: string }) => {
    const room = `entity:${data.entityType}:${data.entityId}`;
    socket.to(room).emit('user_typing', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      entityType: data.entityType,
      entityId: data.entityId,
      isTyping: false,
      timestamp: new Date(),
    });
  });
}

// ============================================
// Disconnection Handler
// ============================================

function handleDisconnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>) {
  const { userId, userName } = socket.data;

  log.info(`[WebSocket] User disconnected: ${userName} (${userId})`);

  // Remove from tracking
  connectedUsers.delete(socket.id);

  // Remove from user's sockets
  const userSocketSet = userSockets.get(userId);
  if (userSocketSet) {
    userSocketSet.delete(socket.id);
    if (userSocketSet.size === 0) {
      userSockets.delete(userId);
      // User is completely offline
      broadcastUserPresence(userId, userName, false);
    }
  }
}

// ============================================
// Room Management
// ============================================

function joinRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>, type: RoomType, id: string) {
  const roomName = getRoomName(type, id);
  socket.join(roomName);

  const userConnection = connectedUsers.get(socket.id);
  if (userConnection) {
    userConnection.rooms.add(roomName);
  }

  log.info(`[WebSocket] ${socket.data.userName} joined room: ${roomName}`);
}

function leaveRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>, type: RoomType, id: string) {
  const roomName = getRoomName(type, id);
  socket.leave(roomName);

  const userConnection = connectedUsers.get(socket.id);
  if (userConnection) {
    userConnection.rooms.delete(roomName);
  }

  log.info(`[WebSocket] ${socket.data.userName} left room: ${roomName}`);
}

function getRoomName(type: RoomType, id: string): string {
  return `${type}:${id}`;
}

// ============================================
// Broadcasting Functions
// ============================================

/**
 * Send notification to specific user
 */
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload
): Promise<void> {
  if (!io) return;

  const roomName = getRoomName('user', userId);
  io.to(roomName).emit('notification', notification);

  // Update notification count
  await sendNotificationCountToUser(userId);
}

/**
 * Send notification to all users in organization
 */
export function sendNotificationToOrganization(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  if (!io) return;

  const roomName = getRoomName('organization', organizationId);
  io.to(roomName).emit(event as keyof ServerToClientEvents, payload as never); // Dynamic emit — callers ensure event/payload type match
}

/**
 * Broadcast project update
 */
export function broadcastProjectUpdate(
  organizationId: string,
  payload: ProjectPayload
): void {
  if (!io) return;

  const roomName = getRoomName('organization', organizationId);
  io.to(roomName).emit('PROJECT_UPDATE', payload);
}

/**
 * Broadcast task update
 */
export function broadcastTaskUpdate(
  organizationId: string,
  userId: string,
  payload: TaskPayload
): void {
  if (!io) return;

  // Send to organization
  if (organizationId) {
    const orgRoom = getRoomName('organization', organizationId);
    io.to(orgRoom).emit('task_update', payload);
  }

  // Also send to assigned user specifically
  if (payload.assignedTo) {
    const userRoom = getRoomName('user', payload.assignedTo);
    io.to(userRoom).emit('task_update', payload);
  }
}

/**
 * Broadcast user presence
 */
function broadcastUserPresence(
  userId: string,
  userName: string,
  isOnline: boolean
): void {
  if (!io) return;

  // Find all organizations this user belongs to and notify them
  const userConnection = findUserConnection(userId);
  if (userConnection?.organizationId) {
    const orgRoom = getRoomName('organization', userConnection.organizationId);

    if (isOnline) {
      io.to(orgRoom).emit('user_online', {
        userId,
        userName,
        timestamp: new Date(),
        organizationId: userConnection.organizationId,
      });
    } else {
      io.to(orgRoom).emit('user_offline', {
        userId,
        userName,
        timestamp: new Date(),
        organizationId: userConnection.organizationId,
      });
    }
  }
}

/**
 * Send notification count to user
 */
async function sendNotificationCount(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>,
  userId: string
): Promise<void> {
  try {
    const count = await db.notification.count({
      where: { userId, isRead: false },
    });
    socket.emit('notification_count', { count });
  } catch (error) {
    log.error('[WebSocket] Error getting notification count:', error);
  }
}

/**
 * Send notification count to all user's sockets
 */
async function sendNotificationCountToUser(userId: string): Promise<void> {
  if (!io) return;

  try {
    const count = await db.notification.count({
      where: { userId, isRead: false },
    });

    const userRoom = getRoomName('user', userId);
    io.to(userRoom).emit('notification_count', { count });
  } catch (error) {
    log.error('[WebSocket] Error getting notification count:', error);
  }
}

/**
 * Broadcast system alert
 */
export function broadcastSystemAlert(
  organizationId: string,
  alert: {
    type: 'info' | 'warning' | 'error' | 'maintenance';
    title: string;
    message: string;
  }
): void {
  if (!io) return;

  const roomName = getRoomName('organization', organizationId);
  io.to(roomName).emit('SYSTEM_ALERT', {
    ...alert,
    alertId: `alert_${Date.now()}`,
    timestamp: new Date(),
    organizationId,
  });
}

// ============================================
// Helper Functions
// ============================================

function findUserConnection(userId: string): ConnectedUser | undefined {
  // O(1) lookup using userSockets Map instead of O(n) scan
  const socketIds = userSockets.get(userId);
  if (!socketIds || socketIds.size === 0) return undefined;
  
  // Return first connected user entry for this userId
  for (const socketId of socketIds) {
    const connection = connectedUsers.get(socketId);
    if (connection) return connection;
  }
  return undefined;
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  const sockets = userSockets.get(userId);
  return sockets !== undefined && sockets.size > 0;
}

/**
 * Get all online users in organization
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
 * Get WebSocket server instance
 */
export function getWebSocketServer(): TypedIOServer | null {
  return io;
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
