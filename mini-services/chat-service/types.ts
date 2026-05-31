/**
 * WebSocket Types and Interfaces
 * Adapted from the main BluePrint app for the standalone chat-service.
 */

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
  priority: 'low' | 'normal' | 'high' | 'urgent';
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
  project_update: (data: ProjectPayload) => void;
  task_update: (data: TaskPayload) => void;
  document_update: (data: DocumentPayload) => void;
  comment: (data: CommentPayload) => void;
  user_online: (data: UserPresencePayload) => void;
  user_offline: (data: UserPresencePayload) => void;
  user_typing: (data: TypingPayload) => void;
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
// Room Types
// ============================================

export type RoomType = 'user' | 'organization' | 'project' | 'task' | 'entity';
