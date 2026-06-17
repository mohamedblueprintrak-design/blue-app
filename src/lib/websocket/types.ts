/**
 * WebSocket Types and Interfaces
 * أنواع وواجهات WebSocket
 */

// ============================================
// Event Types
// ============================================

export enum WebSocketEventType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ORGANIZATION = 'join_organization',
  LEAVE_ORGANIZATION = 'leave_organization',

  // Notification events
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_COUNT = 'notification:count',

  // Project events
  PROJECT_UPDATE = 'project:update',
  PROJECT_CREATED = 'project:created',
  PROJECT_DELETED = 'project:deleted',

  // Task events
  TASK_ASSIGNED = 'task:assigned',
  TASK_UPDATED = 'task:updated',
  TASK_COMPLETED = 'task:completed',
  TASK_COMMENT = 'task:comment',

  // Document events
  DOCUMENT_UPLOADED = 'document:uploaded',
  DOCUMENT_SHARED = 'document:shared',

  // Chat/Comments events
  COMMENT_NEW = 'comment:new',
  COMMENT_REPLY = 'comment:reply',

  // Activity events
  ACTIVITY_NEW = 'activity:new',

  // Presence events
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_TYPING = 'user:typing',

  // System events
  SYSTEM_ALERT = 'system:alert',
  MAINTENANCE = 'system:maintenance',
}

// ============================================
// Event Payloads
// ============================================

export interface BaseEventPayload {
  timestamp: Date;
  organizationId?: string;
}

export interface NotificationPayload extends BaseEventPayload {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
}

export interface ProjectPayload extends BaseEventPayload {
  projectId: string;
  name: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  updatedBy: string;
}

export interface TaskPayload extends BaseEventPayload {
  taskId: string;
  projectId: string;
  title: string;
  assignedTo?: string;
  status: string;
  priority: string;
  dueDate?: Date;
  updatedBy: string;
}

export interface DocumentPayload extends BaseEventPayload {
  documentId: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  projectId?: string;
}

export interface CommentPayload extends BaseEventPayload {
  commentId: string;
  entityType: string;
  entityId: string;
  content: string;
  authorId: string;
  authorName: string;
}

export interface UserPresencePayload extends BaseEventPayload {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export interface TypingPayload extends BaseEventPayload {
  userId: string;
  userName: string;
  entityType: string;
  entityId: string;
  isTyping: boolean;
}

export interface SystemAlertPayload extends BaseEventPayload {
  alertId: string;
  type: 'info' | 'warning' | 'error' | 'maintenance';
  title: string;
  message: string;
  scheduledAt?: Date;
}

// ============================================
// WebSocket Message
// ============================================

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEventType;
  payload: T;
  metadata?: {
    id?: string;
    retryCount?: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
  };
}

// ============================================
// Client -> Server Events
// ============================================

export interface ClientToServerEvents {
  join_organization: (organizationId: string) => void;
  leave_organization: (organizationId: string) => void;
  mark_notification_read: (notificationId: string) => void;
  typing_start: (data: { entityType: string; entityId: string }) => void;
  typing_stop: (data: { entityType: string; entityId: string }) => void;
  subscribe_to_entity: (data: { entityType: string; entityId: string }) => void;
  unsubscribe_from_entity: (data: { entityType: string; entityId: string }) => void;
}

// ============================================
// Server -> Client Events
// ============================================

export interface ServerToClientEvents {
  notification: (data: NotificationPayload) => void;
  PROJECT_UPDATE: (data: ProjectPayload) => void;
  project_update: (data: ProjectPayload) => void;
  task_update: (data: TaskPayload) => void;
  document_update: (data: DocumentPayload) => void;
  comment: (data: CommentPayload) => void;
  user_online: (data: UserPresencePayload) => void;
  user_offline: (data: UserPresencePayload) => void;
  user_typing: (data: TypingPayload) => void;
  SYSTEM_ALERT: (data: SystemAlertPayload) => void;
  system_alert: (data: SystemAlertPayload) => void;
  notification_count: (data: { count: number }) => void;
  error: (data: { message: string; code?: string }) => void;
}

// ============================================
// Socket Data
// ============================================

export interface SocketData {
  userId: string;
  organizationId?: string;
  role: string;
  email: string;
  userName: string;
  connectedAt: Date;
}

// ============================================
// Connection Options
// ============================================

export interface WebSocketConnectionOptions {
  url: string;
  token: string;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

// ============================================
// Room Types
// ============================================

export type RoomType = 'user' | 'organization' | 'project' | 'task' | 'entity';

export interface Room {
  type: RoomType;
  id: string;
}
