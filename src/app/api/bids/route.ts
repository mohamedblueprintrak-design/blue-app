import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, bidCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.BID_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const bids = await db.bid.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bids);
  } catch (error) {
    log.error("Error fetching bids:", error);
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.BID_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    const validation = validateRequest(bidCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const {
      projectId,
      contractorId,
      contractorName,
      contractorContact,
      amount,
      technicalScore,
      financialScore,
      totalScore,
      deadline,
      notes,
      evaluationNotes,
      status,
    } = body;

    // If contractorId is provided, auto-fill contractor info
    let resolvedContractorName = contractorName || "";
    let resolvedContractorContact = contractorContact || "";

    if (contractorId) {
      const contractor = await db.contractor.findUnique({
        where: { id: contractorId },
      });
      if (contractor) {
        if (!resolvedContractorName) {
          resolvedContractorName = contractor.companyName || contractor.name;
        }
        if (!resolvedContractorContact) {
          resolvedContractorContact = contractor.phone || contractor.email;
        }
      }
    }

    if (!resolvedContractorName) {
      return NextResponse.json(
        { error: "Contractor name is required" },
        { status: 400 }
      );
    }

    const bid = await db.bid.create({
      data: {
        projectId,
        contractorId: contractorId || null,
        contractorName: resolvedContractorName,
        contractorContact: resolvedContractorContact,
        amount: amount ? parseFloat(String(amount)) : 0,
        technicalScore: technicalScore !== undefined ? parseInt(String(technicalScore), 10) : 0,
        financialScore: financialScore !== undefined ? parseInt(String(financialScore), 10) : 0,
        totalScore: totalScore !== undefined ? parseFloat(String(totalScore)) : 0,
        deadline: deadline ? new Date(deadline) : null,
        notes: notes || "",
        evaluationNotes: evaluationNotes || "",
        status: status || "SUBMITTED",
        ...orgCreate(ctx),
        createdById: ctx.userId,
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

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    log.error("Error creating bid:", error);
    return NextResponse.json({ error: "Failed to create bid" }, { status: 500 });
  }
}
