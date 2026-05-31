import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { orgFilter, requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, violationUpdateSchema } from '@/lib/api-validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireVerifiedPermission(request, Permission.VIOLATION_READ);
  if ('error' in result) return result.error;
  const ctx = result.user;
  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Filter by organizationId to prevent cross-tenant data access (IDOR)
    const violation = await db.violation.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    if (!violation) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }

    return NextResponse.json(violation);
  } catch (error) {
    log.error("Error fetching violation:", error);
    return NextResponse.json({ error: "Failed to fetch violation" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireVerifiedPermission(request, Permission.VIOLATION_UPDATE);
  if ('error' in result) return result.error;
  const ctx = result.user;
  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(violationUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    // SECURITY: Verify the violation belongs to the user's organization
    const existing = await db.violation.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }

    const { type, severity, description, contractorName, deadline, status, photoBefore, photoAfter, resolutionNotes } = body;

    const violation = await db.violation.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(severity !== undefined && { severity }),
        ...(description !== undefined && { description }),
        ...(contractorName !== undefined && { contractorName }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status !== undefined && { status }),
        ...(photoBefore !== undefined && { photoBefore }),
        ...(photoAfter !== undefined && { photoAfter }),
        ...(resolutionNotes !== undefined && { resolutionNotes }),
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    return NextResponse.json(violation);
  } catch (error) {
    log.error("Error updating violation:", error);
    return NextResponse.json({ error: "Failed to update violation" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireVerifiedPermission(request, Permission.VIOLATION_DELETE);
  if ('error' in result) return result.error;
  const ctx = result.user;
  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify the violation belongs to the user's organization
    const existing = await db.violation.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }

    await db.violation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting violation:", error);
    return NextResponse.json({ error: "Failed to delete violation" }, { status: 500 });
  }
}
