import { NextResponse } from 'next/server';
import { DEMO_CREDENTIALS, isDemoMode, validateDemoMode } from '@/lib/demo-credentials';

/**
 * GET /api/auth/demo-credentials
 *
 * Returns demo login credentials ONLY in demo/development mode.
 * In production, returns an empty array — credentials never ship to the client bundle.
 *
 * Uses the centralized DEMO_CREDENTIALS from @/lib/demo-credentials.ts
 * to ensure emails and passwords match the ROLES dropdown on the login page.
 */
export async function GET() {
  validateDemoMode();
  if (!isDemoMode()) {

    return NextResponse.json({ credentials: [] });
  }

  // SECURITY: Map from server-side DemoCredential to client-side format.
  // Passwords are NOT exposed to the client — use POST /api/auth/demo-login instead.
  const credentials = DEMO_CREDENTIALS.map(c => ({
    email: c.email,
    role: c.role,
    labelAr: c.labelAr,
    labelEn: c.labelEn,
  }));

  return NextResponse.json({ credentials });
}
