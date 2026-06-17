/**
 * Public Stats API — Landing Page
 * لا يتطلب تسجيل الدخول
 *
 * Returns aggregate counts for the landing page hero section.
 * Uses a short cache (60s) to avoid hammering the DB on every page view.
 *
 * SECURITY (multi-tenant): In multi-tenant mode, the orgId parameter is
 * accepted ONLY if it matches a whitelisted set of public org IDs
 * (via PUBLIC_ORG_IDS env var). If no valid orgId is provided,
 * global aggregate stats across all orgs are returned (safe for landing page).
 * Per-org stats for arbitrary org IDs are NEVER exposed without auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { cacheGetOrSet } from '@/lib/cache/redis';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  try {
    const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'public');
    const blocked = rateLimitResponse(rlResult);
    if (blocked) return blocked;

    // SECURITY: Validate orgId against a whitelist of publicly-shareable org IDs.
    // In multi-tenant mode, arbitrary org IDs can be used to enumerate data.
    // Only allow orgs explicitly listed in PUBLIC_ORG_IDS env var (comma-separated).
    const rawOrgId = request.nextUrl.searchParams.get('orgId') || request.headers.get('x-tenant-id');
    const isMultiTenant = process.env.MULTI_TENANT === 'true';
    let orgId: string | null = null;

    if (rawOrgId) {
      // Validate against whitelist
      const publicOrgIds = process.env.PUBLIC_ORG_IDS?.split(',').map(o => o.trim()).filter(Boolean) || [];
      if (publicOrgIds.includes(rawOrgId)) {
        orgId = rawOrgId;
      } else if (isMultiTenant) {
        // In multi-tenant mode, reject unknown org IDs — don't expose arbitrary org data
        orgId = null;
      } else {
        // Single-tenant: allow any orgId (there should only be one org anyway)
        orgId = rawOrgId;
      }
    }

    // In multi-tenant without a valid orgId, return global stats (safe for landing page)
    const orgWhere = orgId ? { organizationId: orgId } : (isMultiTenant ? {} : {});

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
