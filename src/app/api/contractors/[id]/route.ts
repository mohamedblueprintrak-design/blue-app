import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { encrypt, decrypt } from '@/lib/auth/token-utils';
import { validateRequest, validateIdParam, contractorUpdateSchema } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACTOR_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const contractor = await db.contractor.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        _count: {
          select: {
            bids: true,
            evaluations: true,
          },
        },
        bids: {
          select: {
            id: true,
            projectId: true,
            amount: true,
            status: true,
            technicalScore: true,
            financialScore: true,
            totalScore: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                number: true,
                name: true,
                nameEn: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        evaluations: {
          select: {
            id: true,
            projectId: true,
            criteria: true,
            score: true,
            maxScore: true,
            weight: true,
            notes: true,
            evaluatedBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // Calculate average evaluation score
    const allEvaluations = await db.contractorEvaluation.findMany({
      where: { contractorId: id, contractor: { ...orgFilter(ctx) } },
    });

    let avgEvaluationScore: number | null = null;
    if (allEvaluations.length > 0) {
      const weightedSum = allEvaluations.reduce(
        (sum, ev) => sum + (Number(ev.score) / Number(ev.maxScore)) * Number(ev.weight),
        0
      );
      const totalWeight = allEvaluations.reduce(
        (sum, ev) => sum + Number(ev.weight),
        0
      );
      avgEvaluationScore =
        totalWeight > 0
          ? Math.round((weightedSum / totalWeight) * 100 * 100) / 100
          : 0;
    }

    return NextResponse.json({
      ...contractor,
      // Decrypt sensitive financial fields before sending to client
      bankAccount: contractor.bankAccount ? (() => {
        try { return decrypt(contractor.bankAccount); }
        catch { log.warn('[Contractor] Failed to decrypt bankAccount — returning masked', { contractorId: contractor.id }); return '••••••••'; }
      })() : '',
      iban: contractor.iban ? (() => {
        try { return decrypt(contractor.iban); }
        catch { log.warn('[Contractor] Failed to decrypt iban — returning masked', { contractorId: contractor.id }); return '••••••••'; }
      })() : '',
      avgEvaluationScore,
    });
  } catch (error) {
    log.error("Error fetching contractor:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACTOR_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.contractor.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Zod validation for update fields

    const validation = validateRequest(contractorUpdateSchema, body);

    if (!validation.success) {

      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });

    }

    const {
      name,
      nameEn,
      companyName,
      companyEn,
      contactPerson,
      phone,
      email,
      address,
      crNumber,
      licenseNumber,
      licenseExpiry,
      category,
      rating,
      specialties,
      experience,
      bankName,
      bankAccount,
      iban,
      isActive,
      notes,
    } = body;

    const contractor = await db.contractor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(companyName !== undefined && { companyName }),
        ...(companyEn !== undefined && { companyEn }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(crNumber !== undefined && { crNumber }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(licenseExpiry !== undefined && {
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        }),
        ...(category !== undefined && { category }),
        ...(rating !== undefined && { rating: parseInt(String(rating), 10) }),
        ...(specialties !== undefined && { specialties }),
        ...(experience !== undefined && { experience }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccount !== undefined && { bankAccount: bankAccount ? encrypt(bankAccount) : "" }),
        ...(iban !== undefined && { iban: iban ? encrypt(iban) : "" }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        _count: {
          select: {
            bids: true,
            evaluations: true,
          },
        },
      },
    });

    return NextResponse.json(contractor);
  } catch (error) {
    log.error("Error updating contractor:", error);
    return NextResponse.json(
      { error: "Failed to update contractor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACTOR_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.contractor.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    await db.contractor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting contractor:", error);
    return NextResponse.json(
      { error: "Failed to delete contractor" },
      { status: 500 }
    );
  }
}
