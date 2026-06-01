import { NextRequest, NextResponse } from 'next/server';
import { RateLimitTier } from './rate-limit';

export const BASE_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}'`;

  const connectSrc = isDev
    ? "connect-src 'self' https: ws: wss:"
    : "connect-src 'self' https:";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    connectSrc,
    "media-src 'self' https: blob:",
    "frame-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function addSecurityHeaders(
  response: NextResponse,
  nonce: string,
  rateLimitInfo?: { tier: RateLimitTier; remaining: number; resetTime: number; limit: number }
): NextResponse {
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);

  if (rateLimitInfo) {
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
    response.headers.set('X-RateLimit-Tier', rateLimitInfo.tier);
  }

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

export async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const aKey = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bKey = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const aSig = await crypto.subtle.sign('HMAC', aKey, new Uint8Array(0));
  const bSig = await crypto.subtle.sign('HMAC', bKey, new Uint8Array(0));
  const aArr = new Uint8Array(aSig);
  const bArr = new Uint8Array(bSig);
  let result = 0;
  for (let i = 0; i < aArr.length; i++) {
    result |= aArr[i] ^ bArr[i];
  }
  return result === 0;
}

export function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
  
  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
  }
  
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  return '';
}
