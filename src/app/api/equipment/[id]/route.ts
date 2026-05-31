import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { forbiddenResponse } from '@/app/api/utils/response';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, equipmentUpdateSchema } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const equip = await db.equipment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!equip) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Organization isolation: users can only access equipment in their own org
    const orgError = orgCheck(ctx, equip);
    if (orgError) return orgError;

    return NextResponse.json(equip);
  } catch (error) {
    log.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify ownership before updating
    const existing = await db.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }
    const orgError = orgCheck(ctx, existing);
    if (orgError) return orgError;

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(equipmentUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const {
      name,
      type,
      model,
      serialNumber,
      status,
      location,
      dailyRate,
      lastMaintenance,
      nextMaintenance,
    } = body;

    const equip = await db.equipment.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        type: type !== undefined ? type : undefined,
        model: model !== undefined ? model : undefined,
        serialNumber: serialNumber !== undefined ? serialNumber : undefined,
        status: status !== undefined ? status : undefined,
        location: location !== undefined ? location : undefined,
        dailyRate: dailyRate !== undefined ? parseFloat(dailyRate) : undefined,
        lastMaintenance: lastMaintenance !== undefined
          ? (lastMaintenance ? new Date(lastMaintenance) : null)
          : undefined,
        nextMaintenance: nextMaintenance !== undefined
          ? (nextMaintenance ? new Date(nextMaintenance) : null)
          : undefined,
      },
    });

    return NextResponse.json(equip);
  } catch (error) {
    log.error("Error updating equipment:", error);
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify ownership before deleting
    const existing = await db.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }
    const orgError = orgCheck(ctx, existing);
    if (orgError) return orgError;

    await db.equipment.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting equipment:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}
