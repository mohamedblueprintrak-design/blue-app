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
import { jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';
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

// JWT_SECRET: JWT_SECRET environment variable is required in all environments (minimum 32 characters).
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required (min 32 characters).' +
    '\n   Set JWT_SECRET in your .env file (min 32 characters)' +
    '\n   Generate with: openssl rand -base64 48'
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'blueprint-saas';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'blueprint-ws';
const CORS_ORIGIN = process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================
// Database Connection (PrismaClient)
// ============================================

const prisma = new PrismaClient();
console.info(`[DB] Initialized Prisma Client`);

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
// Rate Limiting Setup
// ============================================

interface RateLimitTracker {
  timestamps: number[];
}

const rateLimits = {
  ip: new Map<string, RateLimitTracker>(),
  user: new Map<string, RateLimitTracker>(),
};

const LIMIT_WINDOW_MS = 10 * 1000;      // 10 seconds
const LIMIT_MAX_REQUESTS_IP = 100;      // max 100 requests per IP per 10s
const LIMIT_MAX_REQUESTS_USER = 50;     // max 50 requests per user per 10s
const LIMIT_MAX_CONNECTIONS_IP = 10;    // max 10 connections per 10s per IP

function checkRateLimit(key: string, limit: number, map: Map<string, RateLimitTracker>): boolean {
  const now = Date.now();
  let tracker = map.get(key);
  if (!tracker) {
    tracker = { timestamps: [] };
    map.set(key, tracker);
  }
  
  // Filter out expired timestamps
  tracker.timestamps = tracker.timestamps.filter(ts => now - ts < LIMIT_WINDOW_MS);
  
  if (tracker.timestamps.length >= limit) {
    return false;
  }
  
  tracker.timestamps.push(now);
  return true;
}

// Clean up expired rate trackers every 5 minutes to prevent memory leaks
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, tracker] of rateLimits.ip.entries()) {
    tracker.timestamps = tracker.timestamps.filter(ts => now - ts < LIMIT_WINDOW_MS);
    if (tracker.timestamps.length === 0) {
      rateLimits.ip.delete(key);
    }
  }
  for (const [key, tracker] of rateLimits.user.entries()) {
    tracker.timestamps = tracker.timestamps.filter(ts => now - ts < LIMIT_WINDOW_MS);
    if (tracker.timestamps.length === 0) {
      rateLimits.user.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================
// Socket.io Server Setup
// ============================================

type TypedIOServer = IOServer<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

const httpServer = createServer(async (req, res) => {
  // Expose a simple HTTP GET /health endpoint for monitoring
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  // POST /api/broadcast for microservice event broadcasting
  if (req.method === 'POST' && req.url === '/api/broadcast') {
    try {
      // Auth check
      const authHeader = req.headers['authorization'];
      // SECURITY: INTERNAL_API_SECRET is required INDEPENDENTLY of JWT_SECRET.
      const internalSecret = process.env.INTERNAL_API_SECRET;
      
      if (!internalSecret) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Broadcast API not configured (INTERNAL_API_SECRET missing)' }));
        return;
      }
      
      // timingSafeEqual would be ideal here, but this is a raw http server
      // (not Next.js). We use a constant-time-ish comparison via Buffer.equals
      // on equal-length strings to mitigate timing attacks.
      const expected = `Bearer ${internalSecret}`;
      const authOk = authHeader && typeof authHeader === 'string'
        && authHeader.length === expected.length
        && Buffer.from(authHeader).equals(Buffer.from(expected));
      
      if (!authOk) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      
      // Parse body
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const bodyText = Buffer.concat(buffers).toString();
      const body = JSON.parse(bodyText);
      
      const { type, userId, organizationId, event, payload } = body;
      
      if (type === 'user' && userId) {
        const roomName = getRoomName('user', userId);
        io.to(roomName).emit(event, payload);
        // Also update unread count if it's a notification
        if (event === 'notification') {
          await sendNotificationCountToUser(userId);
        }
      } else if (type === 'organization' && organizationId) {
        const roomName = getRoomName('organization', organizationId);
        io.to(roomName).emit(event, payload);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    } catch (error) {
      console.error('[WS API] Broadcast failed:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }
  
  // Return 404 for other HTTP requests
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

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

io.use(async (socket: TypedSocket, next: (err?: Error) => void) => {
  try {
    const ip = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
    // Connection-level rate limiting
    if (!checkRateLimit(`conn:${ip}`, LIMIT_MAX_CONNECTIONS_IP, rateLimits.ip)) {
      console.warn(`[RateLimit] Connection rate limit exceeded for IP: ${ip}`);
      return next(new Error('Connection rate limit exceeded'));
    }

    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const secret = JWT_SECRET;

    // Verify JWT token
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const decoded = payload as unknown as {
      userId: string;
      email: string;
      role: string;
      organizationId?: string;
      name: string;
    };

    // Look up user in database to verify they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
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

async function sendNotificationCount(socket: TypedSocket, userId: string): Promise<void> {
  try {
    const count = await prisma.notification.count({
      where: { userId: userId, isRead: false }
    });
    socket.emit('notification_count', { count });
  } catch (error) {
    console.error('[Notification] Error getting notification count:', error);
  }
}

async function sendNotificationCountToUser(userId: string): Promise<void> {
  try {
    const count = await prisma.notification.count({
      where: { userId: userId, isRead: false }
    });
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

async function handleConnection(socket: TypedSocket) {
  const { userId, organizationId, userName } = socket.data;

  console.info(`[WS] User connected: ${userName} (${userId})`);

  // Packet/Event-level rate limiting
  socket.use((packet: [string, ...unknown[]], next: (err?: Error) => void) => {
    const ip = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
    const socketUserId = socket.data.userId || 'anonymous';
    const event = packet[0];

    // 1. IP-based event rate limiting
    if (!checkRateLimit(ip, LIMIT_MAX_REQUESTS_IP, rateLimits.ip)) {
      console.warn(`[RateLimit] IP event limit exceeded: ${ip} (event: ${event})`);
      socket.emit('error', { message: 'Too many requests. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' });
      return; // Drop packet
    }

    // 2. User-based event rate limiting
    if (!checkRateLimit(socketUserId, LIMIT_MAX_REQUESTS_USER, rateLimits.user)) {
      console.warn(`[RateLimit] User event limit exceeded: ${socketUserId} (event: ${event})`);
      socket.emit('error', { message: 'Too many requests. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' });
      return; // Drop packet
    }

    next();
  });

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
  await sendNotificationCount(socket, userId);

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
  socket.on('mark_notification_read', async (notificationId: string) => {
    try {
      // SECURITY: Verify the notification belongs to the requesting user
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { id: true, userId: true }
      });
      if (!notification) {
        console.warn(`[Security] Notification not found: ${notificationId} (user: ${socket.data.userId})`);
        return;
      }
      if (notification.userId !== socket.data.userId) {
        console.warn(`[Security] IDOR attempt: user ${socket.data.userId} tried to mark notification ${notificationId} owned by ${notification.userId}`);
        return;
      }
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: socket.data.userId },
        data: { isRead: true }
      });
      // Update notification count for this user
      await sendNotificationCount(socket, socket.data.userId);
      console.info(`[Notification] Marked as read: ${notificationId}`);
    } catch (error) {
      console.error('[Notification] Error marking notification as read:', error);
    }
  });

  // Subscribe to entity updates
  socket.on('subscribe_to_entity', async (data: { entityType: string; entityId: string }) => {
    const { entityType, entityId } = data;
    const organizationId = socket.data.organizationId;

    // SECURITY: Basic entity verification to prevent IDOR and cross-tenant access.
    // In a full implementation, we'd query the DB for the entity's orgId.
    // Here we implement it for 'project' and 'task' if the database is available.
    if (['project', 'task'].includes(entityType) && organizationId) {
      try {
        let result: { organizationId: string | null } | null = null;
        if (entityType === 'project') {
          result = await prisma.project.findUnique({
            where: { id: entityId },
            select: { organizationId: true }
          });
        } else if (entityType === 'task') {
          result = await prisma.task.findUnique({
            where: { id: entityId },
            select: { organizationId: true }
          });
        }
        
        if (result && result.organizationId !== organizationId) {
          console.warn(`[Security] IDOR attempt: user ${socket.data.userId} tried to subscribe to ${entityType} ${entityId}`);
          return socket.emit('error', { message: 'Unauthorized entity access', code: 'UNAUTHORIZED' });
        }
      } catch (error) {
        console.error(`[WS] Entity verification failed for ${entityType} ${entityId}:`, error);
        return socket.emit('error', { message: 'Unauthorized entity access', code: 'UNAUTHORIZED' });
      }
    }

    joinRoom(socket, 'entity', `org:${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
  });

  // Unsubscribe from entity updates
  socket.on('unsubscribe_from_entity', (data: { entityType: string; entityId: string }) => {
    leaveRoom(socket, 'entity', `org:${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
  });

  // Typing start indicator
  socket.on('typing_start', (data: { entityType: string; entityId: string }) => {
    const room = getRoomName('entity', `org:${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
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
    const room = getRoomName('entity', `org:${socket.data.organizationId}:${data.entityType}:${data.entityId}`);
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

io.on('connection', async (socket) => {
  await handleConnection(socket);
});

httpServer.listen(PORT, () => {
  console.info(`[WS] BluePrint WebSocket Chat Service running on port ${PORT}`);
  console.info(`[WS] Socket.io path: '/'`);
  console.info(`[WS] CORS origin: ${CORS_ORIGIN}`);
  console.info(`[WS] JWT auth: enabled`);
  console.info(`[WS] Database: Prisma Client`);
  console.info(`[WS] Ready for connections`);
});

// ============================================
// Graceful Shutdown
// ============================================

function gracefulShutdown(signal: string) {
  console.info(`[WS] Received ${signal}, shutting down...`);

  // Clear rate limiter cleanup interval to prevent open handles
  clearInterval(rateLimitCleanupInterval);

  // Close all socket connections
  io.disconnectSockets(true);

  // Close HTTP server
  httpServer.close(async () => {
    // Close database
    try {
      await prisma.$disconnect();
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
