import { NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/lib/swagger';

/**
 * @openapi
 * /api/docs:
 *   get:
 *     tags: [Documentation]
 *     summary: OpenAPI specification
 *     description: Returns the OpenAPI 3.0 specification for the BluePrint ERP API
 *     security: []
 *     responses:
 *       200:
 *         description: OpenAPI specification JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  try {
    const specs = getSwaggerSpec();
    return NextResponse.json(specs);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
