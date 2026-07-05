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
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
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
// Structured Logger (respects LOG_LEVEL env var)
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;
  const ts = new Date().toISOString();
  const line = meta
    ? `[${ts}] ${level.toUpperCase()} [chat-service] ${message} ${JSON.stringify(meta)}`
    : `[${ts}] ${level.toUpperCase()} [chat-service] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

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
log('info', 'Initialized Prisma Client', { tag: 'DB' });

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

function getClientIp(socket: any): string {
  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  if (forwardedFor) {
    const parts = String(forwardedFor).split(',');
    return parts[0].trim();
  }
  return socket.handshake.address || socket.conn.remoteAddress || 'unknown';
}

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

let redisRateLimitClient: Redis | null = null;
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    redisRateLimitClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 100, 1000),
    });
  } catch (err) {
    log('error', 'Failed to initialize Redis for rate limiting', { tag: 'RateLimit', error: err instanceof Error ? err.message : String(err) });
  }
}

async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
  fallbackMap: Map<string, RateLimitTracker>
): Promise<boolean> {
  if (redisRateLimitClient) {
    try {
      const now = Date.now();
      const redisKey = `ratelimit:${key}`;
      const multi = redisRateLimitClient.multi();
      multi.zadd(redisKey, now, String(now));
      multi.zremrangebyscore(redisKey, 0, now - windowMs);
      multi.zcard(redisKey);
      multi.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
      
      const results = await multi.exec();
      if (results && results[2]) {
        // results[2] is the ZCARD result
        const count = results[2][1] as number;
        return count <= limit;
      }
    } catch (err) {
      log('error', 'Redis rate limit error, falling back to memory', { tag: 'RateLimit', error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Fallback to in-memory rate limiter
  const now = Date.now();
  let tracker = fallbackMap.get(key);
  if (!tracker) {
    tracker = { timestamps: [] };
    fallbackMap.set(key, tracker);
  }
  
  // Filter out expired timestamps
  tracker.timestamps = tracker.timestamps.filter(ts => now - ts < windowMs);
  
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
        log('error', 'Broadcast failed', { tag: 'WS API', error: error instanceof Error ? error.message : String(error) });
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
// Redis Adapter (Multi-Instance Support)
// ============================================
// When REDIS_URL is configured, the Socket.io Redis adapter propagates
// events across multiple chat-service instances. This means:
//   - User A connected to instance 1 can receive notifications
//     sent via instance 2's /api/broadcast endpoint
//   - Presence (online/offline) is shared across instances
//   - Room joins/leaves are synchronized
//
if (REDIS_URL) {
  try {
    const pubClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });
    const subClient = pubClient.duplicate();

    pubClient.on('connect', () => {
      log('info', 'Connected to Redis for multi-instance WebSocket sync', { tag: 'Redis Adapter' });
    });
    pubClient.on('error', (err: Error) => {
      log('error', 'Pub client error', { tag: 'Redis Adapter', error: err instanceof Error ? err.message : String(err) });
    });
    subClient.on('error', (err: Error) => {
      log('error', 'Sub client error', { tag: 'Redis Adapter', error: err instanceof Error ? err.message : String(err) });
    });

    io.adapter(createAdapter(pubClient, subClient));
    log('info', 'Socket.io Redis adapter enabled — multi-instance ready', { tag: 'Redis Adapter' });
  } catch (err) {
    log('error', 'Failed to initialize Redis adapter — running in single-instance mode', { tag: 'Redis Adapter', error: err instanceof Error ? err.message : String(err) });
  }
} else {
  log('info', 'REDIS_URL not set — running in single-instance mode', { tag: 'Redis Adapter' });
}

// ============================================
// JWT Authentication Middleware
// ============================================

io.use(async (socket: TypedSocket, next: (err?: Error) => void) => {
  try {
    const ip = getClientIp(socket);
    // Connection-level rate limiting
    const isAllowed = await checkRateLimitAsync(`conn:${ip}`, LIMIT_MAX_CONNECTIONS_IP, LIMIT_WINDOW_MS, rateLimits.ip);
    if (!isAllowed) {
      log('warn', 'Connection rate limit exceeded for IP', { tag: 'RateLimit', ip });
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
    log('error', 'Authentication error', { tag: 'Auth', error: error instanceof Error ? error.message : String(error) });
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

  log('info', 'User joined room', { tag: 'Room', user: socket.data.userName, roomName });
}

function leaveRoom(socket: TypedSocket, type: RoomType, id: string) {
  const roomName = getRoomName(type, id);
  socket.leave(roomName);

  const userConnection = connectedUsers.get(socket.id);
  if (userConnection) {
    userConnection.rooms.delete(roomName);
  }

  log('info', 'User left room', { tag: 'Room', user: socket.data.userName, roomName });
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
    log('error', 'Error getting notification count', { tag: 'Notification', error: error instanceof Error ? error.message : String(error) });
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
    log('error', 'Error getting notification count for user', { tag: 'Notification', error: error instanceof Error ? error.message : String(error) });
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

  log('info', 'User connected', { tag: 'WS', userName, userId });

  // Packet/Event-level rate limiting
  socket.use(async (packet: [string, ...unknown[]], next: (err?: Error) => void) => {
    const ip = getClientIp(socket);
    const socketUserId = socket.data.userId || 'anonymous';
    const event = packet[0];

    // 1. IP-based event rate limiting
    const ipAllowed = await checkRateLimitAsync(ip, LIMIT_MAX_REQUESTS_IP, LIMIT_WINDOW_MS, rateLimits.ip);
    if (!ipAllowed) {
      log('warn', 'IP event limit exceeded', { tag: 'RateLimit', ip, event });
      socket.emit('error', { message: 'Too many requests. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' });
      return; // Drop packet
    }

    // 2. User-based event rate limiting
    const userAllowed = await checkRateLimitAsync(socketUserId, LIMIT_MAX_REQUESTS_USER, LIMIT_WINDOW_MS, rateLimits.user);
    if (!userAllowed) {
      log('warn', 'User event limit exceeded', { tag: 'RateLimit', user: socketUserId, event });
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
        log('warn', 'Notification not found', { tag: 'Security', notificationId, user: socket.data.userId });
        return;
      }
      if (notification.userId !== socket.data.userId) {
        log('warn', 'IDOR attempt — cross-user notification access', { tag: 'Security', user: socket.data.userId, notificationId, ownerId: notification.userId });
        return;
      }
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: socket.data.userId },
        data: { isRead: true }
      });
      // Update notification count for this user
      await sendNotificationCount(socket, socket.data.userId);
      log('info', 'Notification marked as read', { tag: 'Notification', notificationId });
    } catch (error) {
      log('error', 'Error marking notification as read', { tag: 'Notification', error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Subscribe to entity updates
  socket.on('subscribe_to_entity', async (data: { entityType: string; entityId: string }) => {
    const { entityType, entityId } = data;
    const organizationId = socket.data.organizationId;

    // SECURITY: Verify entity belongs to the user's organization BEFORE allowing
    // subscription. This prevents within-org IDOR (e.g., a VIEWER subscribing to
    // an invoice entity room they shouldn't have access to).
    //
    // SECURITY FIX: Previously only 'project' and 'task' were verified. All other
    // entity types (invoice, document, contract, defect, meeting, etc.) were
    // allowed without DB verification — a within-org IDOR. The org-scoped room
    // naming (org:${orgId}:...) prevented cross-tenant access, but a malicious
    // user within the same org could subscribe to any entity room.
    //
    // Now: we verify orgId for ALL entity types that have an organizationId column.
    // Unknown entity types (not in the map) are rejected with an error.
    if (!organizationId) {
      return socket.emit('error', { message: 'No organization context', code: 'NO_ORG' });
    }

    // Map of entityType -> Prisma model delegate.
    // Only entity types listed here are subscribable. Add new entity types here
    // when new real-time features are added.
    const ENTITY_MODEL_MAP: Record<string, keyof typeof prisma> = {
      project: 'project',
      task: 'task',
      invoice: 'invoice',
      document: 'document',
      contract: 'contract',
      defect: 'defect',
      meeting: 'meeting',
      client: 'client',
      contractor: 'contractor',
      proposal: 'proposal',
      risk: 'risk',
      rfi: 'rFI',
      submittal: 'submittal',
      transmittal: 'transmittal',
      changeOrder: 'changeOrder',
      siteVisit: 'siteVisit',
      siteDiary: 'siteDiary',
      budget: 'budget',
      payment: 'payment',
      bid: 'bid',
      tender: 'tender',
      boqItem: 'bOQItem',
      employee: 'employee',
      attendance: 'attendance',
      leave: 'leave',
      approval: 'approval',
      inspection: 'buildingInspection',
      equipment: 'equipment',
      supplier: 'supplier',
      purchaseOrder: 'purchaseOrder',
      commission: 'commission',
      progressClaim: 'progressClaim',
      retainage: 'retainage',
      guaranteeLetter: 'guaranteeLetter',
      municipalityCorrespondence: 'municipalityCorrespondence',
      designPhase: 'designPhase',
      designDrawing: 'designDrawing',
      automation: 'automation',
      knowledgeArticle: 'knowledgeArticle',
    };

    const modelName = ENTITY_MODEL_MAP[entityType];
    if (!modelName) {
      log('warn', 'Unknown entityType in subscribe request', { tag: 'Security', entityType, user: socket.data.userId });
      return socket.emit('error', { message: `Unknown entity type: ${entityType}`, code: 'UNKNOWN_ENTITY' });
    }

    try {
      // Use findFirst with orgId filter (not findUnique) to enforce org scoping
      // at the DB level. This is defense-in-depth: even if the room naming were
      // bypassed, the DB query would return null for cross-org entities.
      const model = prisma[modelName] as unknown as {
        findFirst: (args: { where: { id: string; organizationId: string }; select: { organizationId: true } }) => Promise<{ organizationId: string | null } | null>;
      };
      const result = await model.findFirst({
        where: { id: entityId, organizationId },
        select: { organizationId: true },
      });

      if (!result) {
        log('warn', 'IDOR attempt — cross-org entity subscribe', { tag: 'Security', user: socket.data.userId, entityType, entityId });
        return socket.emit('error', { message: 'Entity not found or access denied', code: 'UNAUTHORIZED' });
      }
    } catch (error) {
      log('error', 'Entity verification failed', { tag: 'WS', entityType, entityId, error: error instanceof Error ? error.message : String(error) });
      return socket.emit('error', { message: 'Entity verification failed', code: 'UNAUTHORIZED' });
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

  log('info', 'User disconnected', { tag: 'WS', userName, userId });

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
  log('info', 'BluePrint WebSocket Chat Service running', { tag: 'WS', port: PORT });
  log('info', "Socket.io path: '/'", { tag: 'WS' });
  log('info', 'CORS origin configured', { tag: 'WS', corsOrigin: CORS_ORIGIN });
  log('info', 'JWT auth: enabled', { tag: 'WS' });
  log('info', 'Database: Prisma Client', { tag: 'WS' });
  log('info', 'Ready for connections', { tag: 'WS' });
});

// ============================================
// Graceful Shutdown
// ============================================

function gracefulShutdown(signal: string) {
  log('info', 'Received signal, shutting down', { tag: 'WS', signal });

  // Clear rate limiter cleanup interval to prevent open handles
  clearInterval(rateLimitCleanupInterval);

  // Close all socket connections
  io.disconnectSockets(true);

  // Close HTTP server
  httpServer.close(async () => {
    // Close database
    try {
      await prisma.$disconnect();
      log('info', 'Database connection closed', { tag: 'DB' });
    } catch {
      // Database may already be closed
    }

    log('info', 'Server closed', { tag: 'WS' });
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    log('error', 'Forced shutdown after timeout', { tag: 'WS' });
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
