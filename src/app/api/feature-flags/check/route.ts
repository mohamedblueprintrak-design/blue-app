import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/app/api/utils/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { log } from "@/lib/logger";

/**
 * GET: Check if a flag is enabled for the current user.
 * Query param: key
 * Returns: { enabled: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication but not specific permission — any logged-in user can check flags
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ enabled: false });
    }
    const ctx = authResult.user;

    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json(
        { error: "key query parameter is required" },
        { status: 400 }
      );
    }

    const enabled = await isFeatureEnabled(key, {
      userId: ctx.userId,
      organizationId: ctx.organizationId ?? undefined,
      role: ctx.role,
    });

    return NextResponse.json({ enabled });
  } catch (error) {
    log.error("Error checking feature flag:", error);
    return NextResponse.json({ enabled: false });
  }
}
