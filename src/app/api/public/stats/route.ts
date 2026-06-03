/**
 * Public Stats API — Landing Page
 * لا يتطلب تسجيل الدخول
 *
 * Returns aggregate counts for the landing page hero section.
 * Uses a short cache (60s) to avoid hammering the DB on every page view.
 *
 * SECURITY (multi-tenant): When MULTI_TENANT=true, this endpoint returns
 * aggregate counts across ALL organizations for the public landing page.
 * If you need org-scoped stats, use the /api/dashboard endpoint instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { cacheGetOrSet } from '@/lib/cache/redis';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  try {
    const { allowed } = await withRateLimit(request, 'loose');
    if (!allowed) return rateLimitResponse();

    const orgId = request.nextUrl.searchParams.get('orgId') || request.headers.get('x-tenant-id');
    const orgWhere = orgId ? { organizationId: orgId } : (process.env.MULTI_TENANT === 'true' ? { organizationId: '__DENIED__' } : {});

    if (!await isDatabaseAvailable()) {
      return NextResponse.json({
        completedProjects: 0,
        satisfiedClients: 0,
        engineeringDisciplines: 0,
        ongoingProjects: 0,
        source: 'fallback',
      });
    }

    const result = await cacheGetOrSet(
      `public:landing-stats:${orgId || 'global'}`,
      async () => {
        // NOTE: These counts are intentionally cross-tenant for the public landing page.
        // In multi-tenant mode, this shows the platform's total stats, not any single org's.
        // Org-scoped data is available via /api/dashboard (requires auth + orgFilter).
        const [completedProjects, totalClients, ongoingProjects] = await Promise.all([
          db.project.count({ where: { status: 'COMPLETED', ...orgWhere } }),
          db.client.count({ where: orgWhere }),
          db.project.count({ where: { status: { in: ['ACTIVE', 'DELAYED', 'ON_HOLD'] }, ...orgWhere } }),
        ]);

        // Count distinct engineering disciplines from project types
        const disciplineResult = await db.project.findMany({
          where: { type: { not: "" }, ...orgWhere },
          select: { type: true },
          distinct: ['type'],
        });
        const engineeringDisciplines = disciplineResult.length || 6; // fallback to 6 if no data

        return {
          completedProjects,
          satisfiedClients: totalClients,
          engineeringDisciplines,
          ongoingProjects,
          source: 'database',
          company: {
            phone: "+971 50 161 1234",
            email: "info@blueprint-rak.com",
            address: "رأس الخيمة، الإمارات العربية المتحدة",
            workingHours: "08:00-17:00",
          }
        };
      },
      60 // Cache for 60 seconds
    );

    return NextResponse.json(result);
  } catch (error) {
    log.error('Public stats API error:', error);
    // Return fallback data on error so landing page still works
    return NextResponse.json({
      completedProjects: 0,
      satisfiedClients: 0,
      engineeringDisciplines: 0,
      ongoingProjects: 0,
      source: 'fallback',
    });
  }
}
