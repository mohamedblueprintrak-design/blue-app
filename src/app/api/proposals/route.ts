import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, proposalSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { VAT_RATE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const proposals = await db.proposal.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    log.error("Error fetching proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    const validation = validateRequest(proposalSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { number, clientId, projectId, status, items, notes } = body;

    const lineItems = items || [];
    const subtotal = lineItems.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * VAT_RATE;
    const total = subtotal + tax;

    const proposal = await db.proposal.create({
      data: {
        number: number || "",
        clientId,
        projectId: projectId || null,
        status: status || "DRAFT",
        subtotal,
        tax,
        total,
        notes: notes || "",
        ...orgCreate(ctx),
        createdById: ctx.userId,
        items: {
          create: lineItems.map((item: { description: string; quantity: number; unitPrice: number; total: number }) => ({
            description: item.description || "",
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.total || (item.quantity * item.unitPrice),
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    log.error("Error creating proposal:", error);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
