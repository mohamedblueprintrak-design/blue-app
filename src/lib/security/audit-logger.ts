// @ts-check
/**
 * @module audit-logger
 * @description Comprehensive audit logging system for the BluePrint platform.
 * Records security-relevant events (auth, data access, permission changes, etc.)
 * with structured metadata for compliance and incident response.
 *
 * Features:
 * - Multiple log levels (INFO, WARNING, ERROR, CRITICAL)
 * - Categorized logging (AUTH, PROJECT, TASK, INVOICE, CLIENT, USER, SYSTEM, DATA, PERMISSION)
 * - Sensitive data filtering (never logs passwords, tokens, API keys)
 * - Batch write optimization with configurable flush interval
 * - Async database persistence via Prisma
 * - Console output for development
 * - Optional Winston integration for file logging
 */

import { log as winstonLog } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Audit log severity levels.
 */
export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Audit log categories for classifying events.
 */
export type LogCategory =
  | 'AUTH'
  | 'PROJECT'
  | 'TASK'
  | 'INVOICE'
  | 'CLIENT'
  | 'USER'
  | 'SYSTEM'
  | 'DATA'
  | 'PERMISSION';

/**
 * Structured audit log entry.
 */
export interface AuditLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log severity level */
  level: LogLevel;
  /** Event category */
  category: LogCategory;
  /** User ID (null for system events or unauthenticated actions) */
  userId: string | null;
  /** Brief description of the action (e.g., 'user.login', 'project.create') */
  action: string;
  /** Target resource identifier (e.g., project ID, user email) */
  resource?: string;
  /** Additional structured details (will be filtered for sensitive data) */
  details?: Record<string, unknown>;
  /** Client IP address */
  ip?: string;
  /** Client User-Agent string */
  userAgent?: string;
  /** Request path/route */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Unique correlation ID for request tracing */
  requestId?: string;
}

/**
 * Options for the `AuditLogger` constructor.
 */
export interface AuditLoggerOptions {
  /** Minimum log level to record (default: 'INFO') */
  minLevel?: LogLevel;
  /** Whether to output to console (default: true in development) */
  console?: boolean;
  /** Whether to persist to database (default: true) */
  persist?: boolean;
  /** Batch flush interval in milliseconds (default: 5000) */
  flushInterval?: number;
  /** Maximum batch size before auto-flush (default: 50) */
  maxBatchSize?: number;
  /** Whether to enable Winston file logging (default: false) */
  winstonFileLogging?: boolean;
  /** Winston log file path (default: './logs/audit.log') */
  logFilePath?: string;
}

/**
 * Filtered/safe version of an audit log entry for display.
 */
export interface SafeAuditLogEntry extends Omit<AuditLogEntry, 'details'> {
  /** Details with sensitive fields redacted */
  details?: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Log level priority mapping (higher = more severe) */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3,
};

/**
 * Fields that should NEVER appear in log output.
 */
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
  /social[_-]?security/i,
  /bank[_-]?account/i,
  /routing[_-]?number/i,
  /private[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session/i,
  /otp/i,
  /pin/i,
];

/**
 * Default options for the audit logger.
 */
const DEFAULT_OPTIONS: Required<AuditLoggerOptions> = {
  minLevel: 'INFO',
  console: process.env.NODE_ENV !== 'production',
  persist: true,
  flushInterval: 5000,
  maxBatchSize: 50,
  winstonFileLogging: false,
  logFilePath: './logs/audit.log',
};

// ─── Sensitive Data Filtering ────────────────────────────────────────────────

/**
 * Recursively filters sensitive data from an object.
 *
 * Any object key matching a sensitive field pattern will have its value
 * replaced with `'[REDACTED]'`. Nested objects and arrays are handled.
 *
 * @param data - The data to filter
 * @returns A new object with sensitive values redacted
 */
function filterSensitiveData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_FIELD_PATTERNS.some((pattern) =>
      pattern.test(key)
    );

    if (isSensitive) {
      filtered[key] = '[REDACTED]';
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      filtered[key] = filterSensitiveData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      filtered[key] = value.map((item) =>
        item && typeof item === 'object'
          ? filterSensitiveData(item as Record<string, unknown>)
          : item
      );
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

// ─── Audit Logger Class ──────────────────────────────────────────────────────

/**
 * Comprehensive audit logger with batch writing, sensitive data filtering,
 * and multiple output targets (console, database, Winston).
 *
 * @example
 * ```ts
 * const logger = new AuditLogger();
 * logger.info('user.login', { email: 'user@example.com' }, { userId: '123' });
 * logger.warning('auth.failed_2fa', { reason: 'invalid_code' }, { ip: '1.2.3.4' });
 * logger.critical('data.breach_attempt', { query: '...' }, { userId: null });
 * ```
 */
export class AuditLogger {
  private options: Required<AuditLoggerOptions>;
  private buffer: AuditLogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private prismaClient: unknown | null = null;
  private isShuttingDown = false;

  constructor(options: AuditLoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startFlushTimer();
  }

  /**
   * Sets the Prisma client for database persistence.
   * Call this once at application startup with your Prisma client instance.
   *
   * @param prisma - Prisma client instance (must have an `Activity` model or custom log model)
   */
  setPrismaClient(prisma: unknown): void {
    this.prismaClient = prisma;
  }

  /**
   * Logs an event at INFO level.
   */
  info(
    action: string,
    details?: Record<string, unknown>,
    context?: Partial<Pick<AuditLogEntry, 'userId' | 'ip' | 'userAgent' | 'path' | 'method' | 'resource' | 'requestId'>>
  ): void {
    this.log('INFO', action, details, context);
  }

  /**
   * Logs an event at WARNING level.
   */
  warning(
    action: string,
    details?: Record<string, unknown>,
    context?: Partial<Pick<AuditLogEntry, 'userId' | 'ip' | 'userAgent' | 'path' | 'method' | 'resource' | 'requestId'>>
  ): void {
    this.log('WARNING', action, details, context);
  }

  /**
   * Logs an event at ERROR level.
   */
  error(
    action: string,
    details?: Record<string, unknown>,
    context?: Partial<Pick<AuditLogEntry, 'userId' | 'ip' | 'userAgent' | 'path' | 'method' | 'resource' | 'requestId'>>
  ): void {
    this.log('ERROR', action, details, context);
  }

  /**
   * Logs an event at CRITICAL level.
   */
  critical(
    action: string,
    details?: Record<string, unknown>,
    context?: Partial<Pick<AuditLogEntry, 'userId' | 'ip' | 'userAgent' | 'path' | 'method' | 'resource' | 'requestId'>>
  ): void {
    this.log('CRITICAL', action, details, context);
  }

  /**
   * Core logging method.
   *
   * Creates a structured log entry, filters sensitive data, buffers it
   * for batch writing, and outputs to console if enabled.
   */
  log(
    level: LogLevel,
    action: string,
    details?: Record<string, unknown>,
    context?: Partial<Pick<AuditLogEntry, 'userId' | 'ip' | 'userAgent' | 'path' | 'method' | 'resource' | 'requestId'>>
  ): void {
    // Check minimum level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.options.minLevel]) {
      return;
    }

    // Infer category from action string (e.g., 'user.login' → 'AUTH')
    const category = this.inferCategory(action);

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      userId: context?.userId ?? null,
      action,
      resource: context?.resource,
      details: details ? filterSensitiveData(details) : undefined,
      ip: context?.ip,
      userAgent: context?.userAgent,
      path: context?.path,
      method: context?.method,
      requestId: context?.requestId,
    };

    // Console output
    if (this.options.console) {
      this.writeToConsole(entry);
    }

    // Buffer for batch persistence
    if (this.options.persist) {
      this.buffer.push(entry);

      // Auto-flush if batch is full
      if (this.buffer.length >= this.options.maxBatchSize) {
        void this.flush();
      }
    }
  }

  /**
   * Infers a log category from an action string.
   *
   * Uses the prefix before the first dot (e.g., `'user.login'` → `'AUTH'`).
   */
  private inferCategory(action: string): LogCategory {
    const prefix = action.split('.')[0]?.toUpperCase() ?? 'SYSTEM';

    const categoryMap: Record<string, LogCategory> = {
      AUTH: 'AUTH',
      LOGIN: 'AUTH',
      LOGOUT: 'AUTH',
      REGISTER: 'AUTH',
      PASSWORD: 'AUTH',
      '2FA': 'AUTH',
      OTP: 'AUTH',
      SESSION: 'AUTH',
      PROJECT: 'PROJECT',
      TASK: 'TASK',
      INVOICE: 'INVOICE',
      PAYMENT: 'INVOICE',
      CLIENT: 'CLIENT',
      USER: 'USER',
      SYSTEM: 'SYSTEM',
      DATA: 'DATA',
      PERMISSION: 'PERMISSION',
      ROLE: 'PERMISSION',
      UPLOAD: 'DATA',
      EXPORT: 'DATA',
      WEBHOOK: 'SYSTEM',
    };

    return categoryMap[prefix] ?? 'SYSTEM';
  }

  /**
   * Writes a log entry to the console with color-coded output.
   */
  private writeToConsole(entry: AuditLogEntry): void {
    const colors: Record<LogLevel, string> = {
      INFO: '\x1b[36m',    // Cyan
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      CRITICAL: '\x1b[35m', // Magenta
    };
    const reset = '\x1b[0m';

    const color = colors[entry.level];
    const userId = entry.userId ? ` [user:${entry.userId}]` : '';
    const ip = entry.ip ? ` [ip:${entry.ip}]` : '';

    console.info(
      `${color}[${entry.level}]${reset} ${entry.timestamp} [${entry.category}] ${entry.action}${userId}${ip}`,
      entry.details ? JSON.stringify(entry.details) : ''
    );
  }

  /**
   * Flushes the log buffer to the database and Winston.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    // Take all entries and clear the buffer
    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // Database persistence
      if (this.prismaClient) {
        await this.persistToDatabase(entries);
      }

      // Winston file logging
      if (this.options.winstonFileLogging) {
        await this.writeToWinston(entries);
      }
    } catch (error) {
      // If persistence fails, re-add entries to buffer (up to a limit)
      winstonLog.error('[AuditLogger] Failed to flush audit logs:', error);

      if (!this.isShuttingDown && this.buffer.length < this.options.maxBatchSize * 2) {
        this.buffer.unshift(...entries);
      }
    }
  }

  /**
   * Persists audit log entries to the database via Prisma.
   *
   * Expects a Prisma client with a model that accepts the audit log fields.
   * The method uses a generic approach to support different Prisma model names.
   */
  private async persistToDatabase(entries: AuditLogEntry[]): Promise<void> {
    if (!this.prismaClient) return;

    const prisma = this.prismaClient as Record<string, unknown>;

    // Try the Activity model first, then fallback to AuditLog
    const model = (prisma.activity ?? prisma.auditLog) as { createMany: (args: Record<string, unknown>) => Promise<unknown> } | undefined;
    if (!model) return;

    // Batch create (up to 100 at a time to avoid DB limits)
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await model.createMany({
        data: batch.map((entry) => ({
          timestamp: new Date(entry.timestamp),
          level: entry.level,
          category: entry.category,
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource ?? null,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          path: entry.path ?? null,
          method: entry.method ?? null,
          requestId: entry.requestId ?? null,
        })),
        
      });
    }
  }

  /**
   * Writes entries to Winston (if available) for file logging.
   */
  private async writeToWinston(entries: AuditLogEntry[]): Promise<void> {
    try {
      const winston = await import('winston');
      const logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.File({
            filename: this.options.logFilePath,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          }),
        ],
      });

      for (const entry of entries) {
        const { level, ...rest } = entry;
        logger.log({ level: (level as string).toLowerCase(), message: entry.action, ...rest } as { level: string; message: string; [key: string]: unknown });
      }
    } catch {
      // Winston not available — skip file logging silently
    }
  }

  /**
   * Starts the periodic flush timer.
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.options.flushInterval);

    // Don't prevent process exit
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Gracefully shuts down the logger, flushing remaining entries.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
  }

  /**
   * Searches/queries audit logs from the database.
   *
   * @param filters - Query filters
   * @returns Array of matching audit log entries
   */
  async query(filters: {
    userId?: string;
    category?: LogCategory;
    level?: LogLevel;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<unknown[]> {
    if (!this.prismaClient) {
      throw new Error('Prisma client not configured for audit logger');
    }

    const prisma = this.prismaClient as Record<string, unknown>;
    const model = (prisma.activity ?? prisma.auditLog) as { findMany: (args: Record<string, unknown>) => Promise<unknown[]> } | undefined;
    if (!model) return [];

    const where: Record<string, unknown> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.category) where.category = filters.category;
    if (filters.level) where.level = filters.level;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) (where.timestamp as Record<string, unknown>).gte = filters.startDate;
      if (filters.endDate) (where.timestamp as Record<string, unknown>).lte = filters.endDate;
    }

    return model.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
    });
  }
}

// ─── Singleton & Convenience Function ────────────────────────────────────────

/**
 * Global audit logger instance.
 */
let globalLogger: AuditLogger | null = null;

/**
 * Returns the global audit logger instance, creating one if needed.
 */
export function getAuditLogger(): AuditLogger {
  if (!globalLogger) {
    globalLogger = new AuditLogger();
  }
  return globalLogger;
}

/**
 * Initializes the global audit logger with custom options.
 *
 * @param options - Logger configuration options
 * @returns The initialized audit logger
 */
export function initAuditLogger(options?: AuditLoggerOptions): AuditLogger {
  globalLogger = new AuditLogger(options);
  return globalLogger;
}

/**
 * Convenience function for logging audit events using the global logger.
 *
 * Automatically determines the log level based on the action:
 * - Actions containing `error`, `fail`, `denied`, `block` → WARNING
 * - Actions containing `critical`, `breach`, `inject` → CRITICAL
 * - Everything else → INFO
 *
 * @param action - Action identifier (e.g., `'user.login'`, `'auth.failed_login'`)
 * @param details - Additional structured details
 * @param userId - Optional user ID
 * @param meta - Optional request metadata (ip, userAgent, path, method)
 *
 * @example
 * ```ts
 * await auditLog('user.login', { email: 'user@example.com' }, 'user-123', {
 *   ip: '192.168.1.1',
 *   userAgent: req.headers.get('user-agent') ?? undefined,
 *   path: '/api/auth/login',
 *   method: 'POST',
 * });
 * ```
 */
export async function auditLog(
  action: string,
  details?: Record<string, unknown>,
  userId?: string,
  meta?: { ip?: string; userAgent?: string; path?: string; method?: string; resource?: string }
): Promise<void> {
  const logger = getAuditLogger();

  // Auto-determine log level from action keywords
  let level: LogLevel = 'INFO';
  const actionLower = action.toLowerCase();

  if (
    actionLower.includes('critical') ||
    actionLower.includes('breach') ||
    actionLower.includes('inject') ||
    actionLower.includes('exploit')
  ) {
    level = 'CRITICAL';
  } else if (
    actionLower.includes('error') ||
    actionLower.includes('fail') ||
    actionLower.includes('denied') ||
    actionLower.includes('block') ||
    actionLower.includes('invalid') ||
    actionLower.includes('unauthorized')
  ) {
    level = 'WARNING';
  }

  logger.log(level, action, details, {
    userId: userId ?? null,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    path: meta?.path,
    method: meta?.method,
    resource: meta?.resource,
  });
}
