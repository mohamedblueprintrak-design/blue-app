import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission } from "@/app/api/utils/auth";
import { Permission } from "@/lib/auth/types";
import { getAllFlags, upsertFlag, invalidateFlagsCache } from "@/lib/feature-flags";
import { log } from "@/lib/logger";

/**
 * GET: List all feature flags (admin only — requires SETTINGS_READ)
 */
export async function GET(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ("error" in rbac) return rbac.error;

    const flags = await getAllFlags();
    return NextResponse.json(flags);
  } catch (error) {
    log.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create or update a feature flag (admin only — requires SETTINGS_UPDATE)
 */
export async function POST(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ("error" in rbac) return rbac.error;

    const body = await request.json();
    const { key, name, nameAr, description, descriptionAr, enabled, enabledForOrgs, enabledForRoles, percentage } = body;

    // Validate required fields
    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json(
        { error: "Flag key is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Flag name is required" },
        { status: 400 }
      );
    }

    // Validate percentage
    if (percentage !== undefined && (typeof percentage !== "number" || percentage < 1 || percentage > 100)) {
      return NextResponse.json(
        { error: "Percentage must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Validate key format (lowercase, underscores, hyphens only)
    if (!/^[a-z0-9_-]+$/.test(key.trim())) {
      return NextResponse.json(
        { error: "Flag key must be lowercase with underscores or hyphens only" },
        { status: 400 }
      );
    }

    // SECURITY: Derive organizationId from the authenticated user's org, NOT from the request body.
    // This prevents a user from Org A creating feature flags scoped to Org B.
    const flag = await upsertFlag({
      key: key.trim(),
      name: name.trim(),
      nameAr: nameAr?.trim() || undefined,
      description: description?.trim() || undefined,
      descriptionAr: descriptionAr?.trim() || undefined,
      enabled: typeof enabled === "boolean" ? enabled : false,
      enabledForOrgs: enabledForOrgs || undefined,
      enabledForRoles: enabledForRoles || undefined,
      percentage: percentage ?? 100,
      organizationId: rbac.user.organizationId || undefined,
    });

    return NextResponse.json(flag);
  } catch (error) {
    log.error("Error creating/updating feature flag:", error);
    return NextResponse.json(
      { error: "Failed to create/update feature flag" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Toggle a feature flag's enabled state (admin only — requires SETTINGS_UPDATE)
 */
export async function PUT(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ("error" in rbac) return rbac.error;

    const body = await request.json();
    const { key, enabled } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Flag key is required" },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Enabled must be a boolean" },
        { status: 400 }
      );
    }

    const { setFlag } = await import("@/lib/feature-flags");
    await setFlag(key, enabled);
    invalidateFlagsCache();

    return NextResponse.json({ success: true, key, enabled });
  } catch (error) {
    log.error("Error toggling feature flag:", error);
    return NextResponse.json(
      { error: "Failed to toggle feature flag" },
      { status: 500 }
    );
  }
}
