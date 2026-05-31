import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateRequest, validateIdParam, proposalUpdateSchema } from '@/lib/api-validation';
import { VAT_RATE } from '@/lib/constants';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const proposal = await db.proposal.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        client: { select: { id: true, name: true, company: true, email: true, phone: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    log.error("Error fetching proposal:", error);
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(proposalUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { number, clientId, projectId, status, notes, items } = body;

    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.proposal.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    let subtotal: number = Number(existing.subtotal);
    let tax: number = Number(existing.tax);
    let total: number = Number(existing.total);

    if (items && Array.isArray(items)) {
      subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + (item.quantity * item.unitPrice), 0);
      tax = subtotal * VAT_RATE;
      total = subtotal + tax;

      await db.proposalItem.deleteMany({ where: { proposalId: id } });
      await db.proposalItem.createMany({
        data: items.map((item: { description: string; quantity: number; unitPrice: number; total: number }) => ({
          proposalId: id,
          description: item.description || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          total: item.total || (item.quantity * item.unitPrice),
        })),
      });
    }

    const proposal = await db.proposal.update({
      where: { id },
      data: {
        number: number !== undefined ? number : existing.number,
        clientId: clientId !== undefined ? clientId : existing.clientId,
        projectId: projectId !== undefined ? projectId : existing.projectId,
        status: status !== undefined ? status : existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        subtotal,
        tax,
        total,
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(proposal);
  } catch (error) {
    log.error("Error updating proposal:", error);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROPOSAL_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.proposal.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await db.proposalItem.deleteMany({ where: { proposalId: id } });
    await db.proposal.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting proposal:", error);
    return NextResponse.json({ error: "Failed to delete proposal" }, { status: 500 });
  }
}
