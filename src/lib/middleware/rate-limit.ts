export type RateLimitTier = 'strict' | 'auth' | 'api' | 'loose' | 'ai' | 'export' | 'webhook';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisConnectionPromise: Promise<void> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (redisClient) return redisClient;
  if (redisConnectionPromise) {
    await redisConnectionPromise;
    return redisClient;
  }

  redisConnectionPromise = (async () => {
    try {
      redisClient = createClient({
        url: redisUrl,
        socket: { reconnectStrategy: false }
      });
      redisClient.on('error', () => {});
      await redisClient.connect();
    } catch {
      redisClient = null;
    }
  })();

  await redisConnectionPromise;
  return redisClient;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  strict:  { maxRequests: 5,   windowMs: 60_000 },  // 5 req/min  — login, register, password reset
  auth:    { maxRequests: 20,  windowMs: 60_000 },  // 20 req/min — other auth routes (2FA, session, refresh)
  api:     { maxRequests: 100, windowMs: 60_000 },  // 100 req/min — standard CRUD routes
  loose:   { maxRequests: 200, windowMs: 60_000 },  // 200 req/min — read-only/list & dashboard routes
  ai:      { maxRequests: 10,  windowMs: 60_000 },  // 10 req/min  — AI chat/generation (expensive)
  export:  { maxRequests: 10,  windowMs: 60_000 },  // 10 req/min  — PDF/Excel report generation
  webhook: { maxRequests: 300, windowMs: 60_000 },  // 300 req/min — external webhooks (Stripe, WhatsApp, cron)
};

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function cleanupRateLimitStore(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Classify a request pathname into the appropriate rate-limit tier.
 *
 * Tier assignment strategy:
 * ─────────────────────────────────────────────────────────────
 *  strict  — Highly sensitive auth mutations (login, register,
 *            forgot-password, reset-password). 5 req/min.
 *  auth    — Other auth routes (2FA, session, refresh, verify).
 *            20 req/min.
 *  api     — Standard CRUD routes (projects, tasks, clients,
 *            invoices, contracts, payments, budgets, employees,
 *            timesheets, documents, etc.). 100 req/min.
 *  loose   — Read-heavy / list / dashboard endpoints. 200 req/min.
 *  ai      — AI chat, generation & analysis routes. 10 req/min.
 *  export  — PDF/Excel report generation & data export. 10 req/min.
 *  webhook — External webhooks (Stripe, WhatsApp) & cron. 300 req/min.
 * ─────────────────────────────────────────────────────────────
 *
 * Returns `null` for non-API paths (static assets, pages, etc.).
 */
export function classifyRateLimitTier(pathname: string): RateLimitTier | null {
  if (!pathname.startsWith('/api/')) return null;

  // ── Strict tier: sensitive auth mutations ─────────────────────
  if (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/forgot-password' ||
    pathname === '/api/auth/reset-password' ||
    pathname === '/api/profile/delete-account' ||
    pathname === '/api/profile/password'
  ) {
    return 'strict';
  }

  // ── Auth tier: other auth routes ──────────────────────────────
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/profile/')
  ) {
    return 'auth';
  }

  // ── Webhook tier: external services & cron ────────────────────
  if (
    pathname === '/api/stripe/webhook' ||
    pathname === '/api/whatsapp/webhook' ||
    pathname.startsWith('/api/cron/')
  ) {
    return 'webhook';
  }

  // ── AI tier: expensive AI operations ──────────────────────────
  if (pathname.startsWith('/api/ai/')) return 'ai';

  // ── Export tier: report generation & data export ──────────────
  if (pathname.startsWith('/api/reports/')) return 'export';
  if (pathname === '/api/profile/export-data') return 'export';
  if (/\/export(?:\/|$)/.test(pathname)) return 'export';
  if (/\/api\/[^/]+\/export/.test(pathname)) return 'export';

  // ── Loose tier: read-heavy list & dashboard endpoints ─────────
  const loosePaths: readonly string[] = [
    '/api/dashboard',
    '/api/projects-simple',
    '/api/users-simple',
    '/api/health',
    '/api/search',
    '/api/activity-log',
    '/api/notifications/count',
    '/api/notifications/subscribe',
    '/api/feature-flags',
    '/api/init',
    '/api/docs',
    '/api/quote-requests',
  ];
  if (loosePaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return 'loose';
  }

  // ── API tier: standard CRUD routes ────────────────────────────
  // Explicitly listed route groups — ensures every major domain
  // is covered even if new endpoints are added in the future.
  const apiPrefixes: readonly string[] = [
    '/api/projects',
    '/api/tasks',
    '/api/clients',
    '/api/invoices',
    '/api/recurring-invoices',
    '/api/settings',
    '/api/contracts',
    '/api/payments',
    '/api/budgets',
    '/api/employees',
    '/api/timesheets',
    '/api/notifications',
    '/api/documents',
    '/api/users',
    '/api/webhooks',
    '/api/risks',
    '/api/approvals',
    '/api/change-orders',
    '/api/bids',
    '/api/tenders',
    '/api/proposals',
    '/api/purchase-orders',
    '/api/commissions',
    '/api/suppliers',
    '/api/contractors',
    '/api/equipment',
    '/api/inventory',
    '/api/boq',
    '/api/rfi',
    '/api/submittals',
    '/api/transmittals',
    '/api/defects',
    '/api/site-visits',
    '/api/site-diary',
    '/api/inspections',
    '/api/violations',
    '/api/leave',
    '/api/attendance',
    '/api/progress-claims',
    '/api/retainage',
    '/api/guarantee-letters',
    '/api/municipality-correspondence',
    '/api/design-phases',
    '/api/design-drawings',
    '/api/meetings',
    '/api/automations',
    '/api/knowledge',
    '/api/workflows',
    '/api/project-templates',
    '/api/project-assignments',
    '/api/gantt',
    '/api/auto-assignment',
    '/api/supervision-checklists',
    '/api/marketing-campaigns',
    '/api/referrals',
    '/api/report-builder',
    '/api/backup',
    '/api/stripe/checkout',
    '/api/stripe/payment-intent',
    '/api/stripe/payment-methods',
    '/api/stripe/portal',
    '/api/stripe/invoices',
    '/api/stripe/subscriptions',
    '/api/whatsapp/send',
    '/api/whatsapp/templates',
  ];
  if (apiPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return 'api';
  }

  // Catch-all: any other /api/* route gets the default api tier
  return 'api';
}

export function getProxyClientIP(headers: Headers): string {
  const ipRegex = /^[0-9a-fA-F.:]+$/;
  const maxIPLength = 45;

  function sanitize(ip: string): string {
    const cleaned = ip.trim();
    if (cleaned.length > maxIPLength || !ipRegex.test(cleaned)) return 'unknown';
    return cleaned;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const candidate = parts[parts.length - 1].trim();
    const sanitized = sanitize(candidate);
    if (sanitized !== 'unknown') return sanitized;
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    const sanitized = sanitize(realIP);
    if (sanitized !== 'unknown') return sanitized;
  }

  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP) {
    const sanitized = sanitize(cfIP);
    if (sanitized !== 'unknown') return sanitized;
  }

  return 'unknown';
}

export interface RateLimitCheckResult {
  allowed: boolean;
  tier: RateLimitTier;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function checkProxyRateLimit(ip: string, tier: RateLimitTier): Promise<RateLimitCheckResult> {
  const config = RATE_LIMIT_TIERS[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();

  const client = await getRedisClient();

  if (client) {
    const windowStart = now - config.windowMs;
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local windowMs = tonumber(ARGV[4])
      
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local count = redis.call('ZCARD', key)
      
      if count >= maxRequests then
        return {0, count, redis.call('ZSCORE', key, redis.call('ZRANGE', key, 0, 0)[1]) or now}
      end
      
      redis.call('ZADD', key, now, now .. ':' .. ARGV[5])
      redis.call('PEXPIRE', key, windowMs)
      
      return {1, count + 1, now + windowMs}
    `;

    try {
      const result = await client.eval(luaScript, {
        keys: [key],
        arguments: [now.toString(), windowStart.toString(), config.maxRequests.toString(), config.windowMs.toString(), crypto.randomUUID()],
      }) as [number, number, number];

      const [allowed, count, resetTime] = result;

      return {
        allowed: allowed === 1,
        tier,
        remaining: Math.max(0, config.maxRequests - count),
        resetTime,
        retryAfter: allowed === 0 ? Math.ceil((resetTime - now) / 1000) : undefined,
      };
    } catch (e) {
      // fallback to memory if eval fails
    }
  }

  // Memory Fallback
  cleanupRateLimitStore();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      tier,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      tier,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    tier,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}
