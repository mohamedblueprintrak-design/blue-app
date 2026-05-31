import { db } from "@/lib/db";
import { Currency } from '@/types/db-enums';
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// Zod schema for guarantee letter creation
const guaranteeLetterCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  type: z.enum(['PERFORMANCE', 'ADVANCE_PAYMENT', 'RETENTION', 'BID_BOND', 'CUSTOMS']).default('PERFORMANCE'),
  amount: z.coerce.number().min(0).max(999999999).optional().default(0),
  issuer: z.string().max(200).optional().default(''),
  guaranteeNumber: z.string().max(100).optional().default(''),
  bankName: z.string().max(200).optional().default(''),
  currency: z.string().max(10).default('AED'),
  issueDate: z.string().optional().default(''),
  expiryDate: z.string().min(1, 'Expiry date is required').optional().default(''),
  referenceNumber: z.string().max(100).optional().default(''),
  status: z.enum(['ACTIVE', 'EXPIRED', 'RELEASED', 'CANCELLED', 'CALLED']).default('ACTIVE'),
  beneficiaryName: z.string().max(200).optional().default(''),
  documentUrl: z.string().max(500).optional().default(''),
});

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (status) where.status = status;

    const guaranteeLetters = await db.guaranteeLetter.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(guaranteeLetters);
  } catch (error) {
    log.error("Error fetching guarantee letters:", error);
    return NextResponse.json(
      { error: "Failed to fetch guarantee letters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const rawBody = await request.json();

    // Zod validation for guarantee letter fields
    const validation = guaranteeLetterCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const {
      projectId, type, guaranteeNumber, bankName, amount, currency,
      issueDate, expiryDate, status, beneficiaryName, documentUrl,
    } = validation.data;

    const guaranteeLetter = await db.guaranteeLetter.create({
      data: {
        projectId,
        type: (type || "PERFORMANCE") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        guaranteeNumber: guaranteeNumber || "",
        bankName: bankName || "",
        amount: amount || 0,
        currency: (currency || "AED") as Currency,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: (status || "ACTIVE") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        beneficiaryName: beneficiaryName || "",
        documentUrl: documentUrl || "",
        ...orgCreate(ctx),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(guaranteeLetter, { status: 201 });
  } catch (error) {
    log.error("Error creating guarantee letter:", error);
    return NextResponse.json(
      { error: "Failed to create guarantee letter" },
      { status: 500 }
    );
  }
}
