export type RateLimitTier = 'auth' | 'api' | 'ai' | 'export';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  auth:   { maxRequests: 10, windowMs: 60_000 },  // 10 req/min
  api:    { maxRequests: 100, windowMs: 60_000 }, // 100 req/min
  ai:     { maxRequests: 10, windowMs: 60_000 },  // 10 req/min
  export: { maxRequests: 10, windowMs: 60_000 },  // 10 req/min
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

export function classifyRateLimitTier(pathname: string): RateLimitTier | null {
  if (!pathname.startsWith('/api/')) return null;
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/ai/')) return 'ai';
  if (pathname.startsWith('/api/reports/')) return 'export';
  if (/\/api\/[^/]+\/export/.test(pathname)) return 'export';
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

export function checkProxyRateLimit(ip: string, tier: RateLimitTier): RateLimitCheckResult {
  cleanupRateLimitStore();

  const config = RATE_LIMIT_TIERS[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();
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
