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
  const encoder = new TextEncoder();
  const aBuffer = encoder.encode(a);
  const bBuffer = encoder.encode(b);
  
  const aHash = await crypto.subtle.digest('SHA-256', aBuffer);
  const bHash = await crypto.subtle.digest('SHA-256', bBuffer);
  
  const aArr = new Uint8Array(aHash);
  const bArr = new Uint8Array(bHash);
  
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
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const dynamicBase = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : '');
    
    if (dynamicBase && origin === dynamicBase) {
      return origin;
    }
    return process.env.NEXTAUTH_URL || process.env.APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
  }
  
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  return '';
}
