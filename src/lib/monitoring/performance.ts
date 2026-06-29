/**
 * Performance Monitoring Middleware
 * وسيط مراقبة الأداء
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

// Performance metrics interface
interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// In-memory metrics store (use Redis in production)
const metricsStore: PerformanceMetrics[] = [];
const MAX_STORE_SIZE = 1000;

// Slow request threshold (ms)
const SLOW_REQUEST_THRESHOLD = 1000;

/**
 * Record performance metrics
 */
function recordMetrics(metrics: PerformanceMetrics) {
  metricsStore.push(metrics);
  
  // Keep only recent metrics
  if (metricsStore.length > MAX_STORE_SIZE) {
    metricsStore.shift();
  }
  
  // Log slow requests
  if (metrics.duration > SLOW_REQUEST_THRESHOLD) {
    log.warn('Slow request detected', {
      path: metrics.path,
      method: metrics.method,
      duration: metrics.duration,
      statusCode: metrics.statusCode,
    });
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  if (metricsStore.length === 0) {
    return {
      totalRequests: 0,
      averageDuration: 0,
      slowRequests: 0,
      errorRate: 0,
    };
  }
  
  const totalRequests = metricsStore.length;
  const totalDuration = metricsStore.reduce((sum, m) => sum + m.duration, 0);
  const slowRequests = metricsStore.filter(m => m.duration > SLOW_REQUEST_THRESHOLD).length;
  const errors = metricsStore.filter(m => m.statusCode >= 400).length;
  
  return {
    totalRequests,
    averageDuration: Math.round(totalDuration / totalRequests),
    slowRequests,
    slowRequestRate: (slowRequests / totalRequests * 100).toFixed(2),
    errorRate: (errors / totalRequests * 100).toFixed(2),
    recentMetrics: metricsStore.slice(-100),
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  // Skip static files and health checks
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.includes('.') ||
    path === '/api/health'
  ) {
    return null;
  }
  
  // Return response handler
  return {
    onResponse: (response: NextResponse) => {
      const duration = Date.now() - startTime;
      
      recordMetrics({
        path,
        method,
        statusCode: response.status,
        duration,
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown',
      });
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Request-Id', crypto.randomUUID());
      
      return response;
    },
  };
}

/**
 * Get route-specific statistics
 */
export function getRouteStats() {
  const routeMap = new Map<string, { count: number; totalDuration: number; errors: number }>();
  
  metricsStore.forEach(metric => {
    const key = `${metric.method} ${metric.path}`;
    const existing = routeMap.get(key) || { count: 0, totalDuration: 0, errors: 0 };
    
    routeMap.set(key, {
      count: existing.count + 1,
      totalDuration: existing.totalDuration + metric.duration,
      errors: existing.errors + (metric.statusCode >= 400 ? 1 : 0),
    });
  });
  
  const result: Array<{
    route: string;
    count: number;
    avgDuration: number;
    errorRate: number;
  }> = [];
  
  routeMap.forEach((value, key) => {
    result.push({
      route: key,
      count: value.count,
      avgDuration: Math.round(value.totalDuration / value.count),
      errorRate: parseFloat((value.errors / value.count * 100).toFixed(2)),
    });
  });
  
  return result.sort((a, b) => b.count - a.count);
}

/**
 * Clear metrics
 */
export function clearMetrics() {
  metricsStore.length = 0;
}

export type { PerformanceMetrics };
