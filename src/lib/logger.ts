/**
 * Logging System for BluePrint SaaS
 * نظام التسجيل للمشروع
 * 
 * Uses Winston for structured logging with:
 * - Console output for development
 * - File rotation for production
 * - Different log levels (error, warn, info, debug)
 */

import winston from 'winston';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`
  )
);

// Format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create logs directory path
const logsDir = 'logs';

// Transport for daily rotating log files
let fileRotateTransport: winston.transport | null = null;
let errorFileTransport: winston.transport | null = null;

// Only create file transports if winston-daily-rotate-file is available
try {
  // Dynamic import for winston-daily-rotate-file
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DailyRotateFile = require('winston-daily-rotate-file');
  
  fileRotateTransport = new DailyRotateFile({
    filename: `${logsDir}/application-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
  });

  errorFileTransport = new DailyRotateFile({
    filename: `${logsDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: fileFormat,
  });
} catch {
  // winston-daily-rotate-file not available, skip file logging
  console.warn('winston-daily-rotate-file not available, file logging disabled');
}

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    consoleTransport,
  ],
});

// Add file transports only in production and if available
if (process.env.NODE_ENV === 'production' && fileRotateTransport && errorFileTransport) {
  logger.add(fileRotateTransport);
  logger.add(errorFileTransport);
}

// Helper functions for common log patterns
export const log = {
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(message, meta);
  },
  
  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
    const errorMeta = error instanceof Error 
      ? { error: error.message, stack: error.stack, ...meta }
      : { error, ...meta };
    logger.error(message, errorMeta);
  },
  
  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(message, meta);
  },
  
  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(message, meta);
  },
  
  http: (message: string, meta?: Record<string, unknown>) => {
    logger.http(message, meta);
  },

  // API request logging
  apiRequest: (method: string, path: string, userId?: string, meta?: Record<string, unknown>) => {
    logger.http(`[${method}] ${path}`, { userId, ...meta });
  },

  // API response logging
  apiResponse: (method: string, path: string, statusCode: number, duration: number, meta?: Record<string, unknown>) => {
    const message = `[${method}] ${path} - ${statusCode} (${duration}ms)`;
    if (statusCode >= 400) {
      logger.warn(message, meta);
    } else {
      logger.http(message, meta);
    }
  },

  // Database operation logging
  db: (operation: string, table: string, meta?: Record<string, unknown>) => {
    logger.debug(`[DB] ${operation} on ${table}`, meta);
  },

  // Service operation logging
  service: (service: string, operation: string, meta?: Record<string, unknown>) => {
    logger.debug(`[${service}] ${operation}`, meta);
  },

  // Security event logging
  security: (event: string, meta?: Record<string, unknown>) => {
    logger.warn(`[SECURITY] ${event}`, meta);
  },
};

export default logger;
