import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, bidUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.BID_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const bid = await db.bid.findFirst({
      where: { id, ...orgWhere },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        contractor: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            companyName: true,
            companyEn: true,
            contactPerson: true,
            phone: true,
            email: true,
            category: true,
            rating: true,
            crNumber: true,
            licenseNumber: true,
            specialties: true,
            address: true,
          },
        },
        evaluations: {
          select: {
            id: true,
            criteria: true,
            score: true,
            maxScore: true,
            weight: true,
            notes: true,
            evaluatedBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    return NextResponse.json(bid);
  } catch (error) {
    log.error("Error fetching bid:", error);
    return NextResponse.json({ error: "Failed to fetch bid" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.BID_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();

    // Zod validation for bid update fields
    const validation = validateRequest(bidUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data;

    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.bid.findFirst({
      where: { id, ...orgWhere },
      include: { contractor: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    // When status changes to accepted/rejected and contractorId exists, auto-fill name
    let resolvedContractorName = validatedData.contractorName;
    if (
      (validatedData.status === "ACCEPTED" || validatedData.status === "REJECTED") &&
      resolvedContractorName === undefined &&
      existing.contractorId &&
      existing.contractor
    ) {
      resolvedContractorName =
        existing.contractor.companyName || existing.contractor.name || undefined;
    }

    const bid = await db.bid.update({
      where: { id },
      data: {
        ...(validatedData.contractorName !== undefined && { contractorName: validatedData.contractorName }),
        ...(resolvedContractorName !== undefined && {
          contractorName: resolvedContractorName,
        }),
        ...(validatedData.contractorContact !== undefined && { contractorContact: validatedData.contractorContact }),
        ...(validatedData.amount !== undefined && { amount: validatedData.amount }),
        ...(validatedData.technicalScore !== undefined && { technicalScore: validatedData.technicalScore }),
        ...(validatedData.financialScore !== undefined && { financialScore: validatedData.financialScore }),
        ...(validatedData.totalScore !== undefined && { totalScore: validatedData.totalScore }),
        ...(validatedData.deadline !== undefined && {
          deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        ...(validatedData.evaluationNotes !== undefined && { evaluationNotes: validatedData.evaluationNotes }),
        ...(validatedData.status !== undefined && { status: validatedData.status as any }), // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        contractor: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            companyName: true,
            companyEn: true,
            contactPerson: true,
            phone: true,
            email: true,
            category: true,
            rating: true,
          },
        },
      },
    });

    return NextResponse.json(bid);
  } catch (error) {
    log.error("Error updating bid:", error);
    return NextResponse.json({ error: "Failed to update bid" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.BID_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.bid.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }
    await db.bid.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting bid:", error);
    return NextResponse.json({ error: "Failed to delete bid" }, { status: 500 });
  }
}
