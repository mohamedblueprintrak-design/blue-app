import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, tenderUpdateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Filter by organizationId to prevent cross-tenant data access (IDOR)
    const tender = await db.tender.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, phone: true },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!tender) {
      return NextResponse.json(
        { error: "Tender not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tender);
  } catch (error) {
    log.error("Error fetching tender:", error);
    return NextResponse.json(
      { error: "Failed to fetch tender" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();

    // Zod validation for update fields
    const validation = validateRequest(tenderUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    // SECURITY: Sanitization (After Validation)
    const sanitizedData = sanitizeObject(validation.data || body);

    // SECURITY: Verify the tender belongs to the user's organization
    const existing = await db.tender.findFirst({ where: { id, deletedAt: null, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tender not found" },
        { status: 404 }
      );
    }

    const {
      tenderNumber,
      title,
      authority,
      projectType,
      description,
      estimatedBudget,
      currency,
      closingDate,
      submissionDate,
      qualifications,
      requiredDocs,
      status,
      winnerName,
      lostReason,
      competitorAnalysis,
      notes,
      source,
      sourceUrl,
      assignedTo,
    } = sanitizedData;

    const tender = await db.tender.update({
      where: { id },
      data: {
        ...(tenderNumber !== undefined && { tenderNumber }),
        ...(title !== undefined && { title }),
        ...(authority !== undefined && { authority }),
        ...(projectType !== undefined && { projectType }),
        ...(description !== undefined && { description }),
        ...(estimatedBudget !== undefined && {
          estimatedBudget: estimatedBudget ? Number(estimatedBudget) : 0,
        }),
        ...(currency !== undefined && { currency }),
        ...(closingDate !== undefined && {
          closingDate: closingDate ? new Date(closingDate) : null,
        }),
        ...(submissionDate !== undefined && {
          submissionDate: submissionDate ? new Date(submissionDate) : null,
        }),
        ...(qualifications !== undefined && { qualifications }),
        ...(requiredDocs !== undefined && { requiredDocs }),
        ...(status !== undefined && { status }),
        ...(winnerName !== undefined && { winnerName }),
        ...(lostReason !== undefined && { lostReason }),
        ...(competitorAnalysis !== undefined && { competitorAnalysis }),
        ...(notes !== undefined && { notes }),
        ...(source !== undefined && { source }),
        ...(sourceUrl !== undefined && { sourceUrl }),
        ...(assignedTo !== undefined && {
          assignedTo: assignedTo || null,
        }),
      },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    return NextResponse.json(tender);
  } catch (error) {
    log.error("Error updating tender:", error);
    return NextResponse.json(
      { error: "Failed to update tender" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify the tender belongs to the user's organization
    const existing = await db.tender.findFirst({ where: { id, deletedAt: null, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tender not found" },
        { status: 404 }
      );
    }

    await db.tender.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting tender:", error);
    return NextResponse.json(
      { error: "Failed to delete tender" },
      { status: 500 }
    );
  }
}
