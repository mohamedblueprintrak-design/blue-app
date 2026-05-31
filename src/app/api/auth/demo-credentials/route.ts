import { NextResponse } from 'next/server';
import { DEMO_CREDENTIALS, isDemoMode } from '@/lib/demo-credentials';

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
  if (!isDemoMode()) {
    return NextResponse.json({ credentials: [] });
  }

  // Map from server-side DemoCredential to client-side format.
  // The client expects { email, password, role, labelAr, labelEn }
  // while the server type has additional fields (nameAr, nameEn).
  const credentials = DEMO_CREDENTIALS.map(c => ({
    email: c.email,
    password: c.password,
    role: c.role,
    labelAr: c.labelAr,
    labelEn: c.labelEn,
  }));

  return NextResponse.json({ credentials });
}
