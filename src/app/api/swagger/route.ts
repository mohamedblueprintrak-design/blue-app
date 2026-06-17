import { NextRequest, NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/lib/swagger';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';

export async function GET(request: NextRequest) {
  // SECURITY: Restrict API documentation to admins only to prevent reconnaissance
  const authResult = await requireVerifiedAdmin(request);
  if ('error' in authResult) return authResult.error;

  const spec = getSwaggerSpec();
  return NextResponse.json(spec);
}
