import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission } from "@/app/api/utils/auth";
import { Permission } from "@/lib/auth/types";

// GET /api/dashboard/layout
// Returns a placeholder response — actual layout persistence is handled via localStorage on the client.
export async function GET(request: NextRequest) {
  // RBAC CHECK — reading settings
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
  if ("error" in rbac) return rbac.error;

  return NextResponse.json({
    storageKey: "blueprint-dashboard-layout",
    note: "Dashboard layout is persisted in localStorage on the client side. This endpoint is reserved for future server-side sync.",
  });
}

// POST /api/dashboard/layout
// Accepts layout data for future server-side persistence.
export async function POST(request: NextRequest) {
  // RBAC CHECK — updating settings
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ("error" in rbac) return rbac.error;

  try {
    const _body = await request.json();
    // In the future, this could persist to a database or user settings.
    // For now, layout is stored in localStorage on the client.
    return NextResponse.json({ success: true, message: "Layout acknowledged (client-side localStorage is primary store)." });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
