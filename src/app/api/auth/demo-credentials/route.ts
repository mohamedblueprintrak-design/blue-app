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

  // DEMO MODE: Include passwords so the Quick Login auto-fill works.
  // This endpoint is ONLY reachable when DEMO_MODE=true — passwords are
  // already public in the seed data and source code, so exposing them here
  // is safe and necessary for the "select role → auto-fill email + password"
  // UX on the login page.
  const credentials = DEMO_CREDENTIALS.map(c => ({
    email: c.email,
    password: c.password,
    role: c.role,
    labelAr: c.labelAr,
    labelEn: c.labelEn,
  }));

  return NextResponse.json({ credentials });
}
