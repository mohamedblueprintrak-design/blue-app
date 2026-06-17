import { NextRequest, NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/lib/swagger';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';

/**
 * @openapi
 * /api/docs:
 *   get:
 *     tags: [Documentation]
 *     summary: OpenAPI specification
 *     description: Returns the OpenAPI 3.0 specification for the BluePrint ERP API. Admin-only to prevent reconnaissance.
 *     responses:
 *       200:
 *         description: OpenAPI specification JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Restrict API documentation to admins only to prevent reconnaissance
    const authResult = await requireVerifiedAdmin(request);
    if ('error' in authResult) return authResult.error;

    const specs = getSwaggerSpec();
    return NextResponse.json(specs);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
