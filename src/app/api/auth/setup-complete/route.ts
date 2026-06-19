/**
 * API Route: Setup Complete — One-time credentials display
 *
 * POST /api/auth/setup-complete
 *   body: { setupToken: string }
 *   returns: { credentials: DemoCredential[], expiresAt: string }
 *
 * GET /api/auth/setup-complete?token=xxx
 *   returns: { credentials, expiresAt } if token valid, 401 otherwise
 *
 * SECURITY:
 * - Setup tokens are written to `.setup-tokens.json` by `setup.sh`
 * - Each token is single-use (consumed after first successful read)
 * - Tokens expire after 24 hours
 * - Tokens are hashed (SHA-256) — plaintext never stored
 * - File is auto-deleted after expiry or consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { DEMO_CREDENTIALS, isDemoMode } from '@/lib/demo-credentials';
import { log } from '@/lib/logger';

// ============================================
// Constants
// ============================================

const TOKENS_FILE = path.resolve(process.cwd(), '.setup-tokens.json');
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredToken {
  hash: string;
  createdAt: number;
  consumed: boolean;
}

// ============================================
// Helpers
// ============================================

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function readTokens(): Promise<StoredToken[]> {
  try {
    const content = await fs.readFile(TOKENS_FILE, 'utf-8');
    const data = JSON.parse(content);
    if (!Array.isArray(data.tokens)) return [];
    return data.tokens;
  } catch {
    return [];
  }
}

async function writeTokens(tokens: StoredToken[]): Promise<void> {
  const data = JSON.stringify({
    version: 1,
    tokens,
    updatedAt: new Date().toISOString(),
  }, null, 2);
  await fs.writeFile(TOKENS_FILE, data, { mode: 0o600 }); // owner read/write only
}

async function cleanupExpiredTokens(tokens: StoredToken[]): Promise<StoredToken[]> {
  const now = Date.now();
  const fresh = tokens.filter(t => (now - t.createdAt) < TOKEN_EXPIRY_MS);
  // If we removed any, persist the cleanup
  if (fresh.length !== tokens.length) {
    await writeTokens(fresh);
  }
  return fresh;
}

// ============================================
// POST: Validate token and return credentials
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Only allow in demo mode or development
    if (process.env.NODE_ENV === 'production' && !isDemoMode()) {
      return NextResponse.json(
        { error: { code: 'NOT_AVAILABLE', message: 'هذه الميزة غير متاحة في الإنتاج' } },
        { status: 403 }
      );
    }

    let body: { setupToken?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'طلب غير صالح' } },
        { status: 400 }
      );
    }

    const { setupToken } = body;
    if (!setupToken || typeof setupToken !== 'string') {
      return NextResponse.json(
        { error: { code: 'TOKEN_REQUIRED', message: 'رمز الإعداد مطلوب' } },
        { status: 400 }
      );
    }

    // Read + cleanup tokens
    let tokens = await readTokens();
    tokens = await cleanupExpiredTokens(tokens);

    // Find matching token
    const tokenHash = hashToken(setupToken);
    const matchIndex = tokens.findIndex(t => t.hash === tokenHash && !t.consumed);

    if (matchIndex === -1) {
      log.security('Setup-complete: invalid or already-consumed token', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: { code: 'TOKEN_INVALID', message: 'الرمز غير صحيح أو منتهي الصلاحية أو تم استخدامه بالفعل' } },
        { status: 401 }
      );
    }

    // Mark token as consumed (single-use)
    tokens[matchIndex].consumed = true;
    await writeTokens(tokens);

    // Return demo credentials
    const credentials = DEMO_CREDENTIALS.map(c => ({
      email: c.email,
      password: c.password,
      role: c.role,
      labelAr: c.labelAr,
      labelEn: c.labelEn,
    }));

    log.info('Setup-complete: credentials displayed (one-time)', {
      role: 'admin',
    });

    return NextResponse.json({
      credentials,
      expiresAt: new Date(tokens[matchIndex].createdAt + TOKEN_EXPIRY_MS).toISOString(),
      warning: 'هذه البيانات تُعرض مرة واحدة فقط. احفظها الآن في مكان آمن.',
      warningEn: 'These credentials are shown ONCE. Save them now in a secure location.',
    });
  } catch (error) {
    log.error('Setup-complete POST error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'حدث خطأ في الخادم' } },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Quick status check (does NOT return credentials)
// ============================================

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production' && !isDemoMode()) {
      return NextResponse.json({ available: false });
    }

    const tokens = await readTokens();
    const now = Date.now();
    const activeTokens = tokens.filter(t => !t.consumed && (now - t.createdAt) < TOKEN_EXPIRY_MS);

    return NextResponse.json({
      available: activeTokens.length > 0,
      activeCount: activeTokens.length,
    });
  } catch {
    return NextResponse.json({ available: false, activeCount: 0 });
  }
}
