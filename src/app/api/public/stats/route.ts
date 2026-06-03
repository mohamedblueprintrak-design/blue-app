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

import { NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { cacheGetOrSet } from '@/lib/cache/redis';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    // If DB is not available, return fallback static data
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
      'public:landing-stats',
      async () => {
        // NOTE: These counts are intentionally cross-tenant for the public landing page.
        // In multi-tenant mode, this shows the platform's total stats, not any single org's.
        // Org-scoped data is available via /api/dashboard (requires auth + orgFilter).
        const [completedProjects, totalClients, ongoingProjects] = await Promise.all([
          db.project.count({ where: { status: 'COMPLETED' } }),
          db.client.count(),
          db.project.count({ where: { status: { in: ['ACTIVE', 'DELAYED', 'ON_HOLD'] } } }),
        ]);

        // Count distinct engineering disciplines from project types
        const disciplineResult = await db.project.findMany({
          where: { type: { not: "" } },
          select: { type: true },
          distinct: ['type'],
        });
        const engineeringDisciplines = disciplineResult.length || 6; // fallback to 6 if no data

        // Fetch company settings (we'll just get the first one for the public landing page)
        const companySettings = await db.companySettings.findFirst({
          select: { phone: true, email: true, address: true, workingHours: true }
        });

        return {
          completedProjects,
          satisfiedClients: totalClients,
          engineeringDisciplines,
          ongoingProjects,
          source: 'database',
          company: companySettings || {
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
