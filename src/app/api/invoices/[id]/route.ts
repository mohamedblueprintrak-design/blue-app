import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgCheck } from '../../utils/auth';
import { errorResponse, notFoundResponse, forbiddenResponse } from '../../utils/response';
import { validateRequest, invoiceUpdateSchema, invoiceItemUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { z } from 'zod';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// Tax rate - configurable via environment variable (default from shared constants)
import { VAT_RATE } from '@/lib/constants';
const TAX_RATE = parseFloat(process.env.TAX_RATE || String(VAT_RATE));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, company: true, email: true, phone: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!invoice || invoice.deletedAt) {
      return notFoundResponse("Invoice not found");
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, invoice);
    if (orgError) return orgError;

    return NextResponse.json(invoice);
  } catch (error) {
    log.error("Error fetching invoice:", error);
    return errorResponse("Failed to fetch invoice", "SERVER_ERROR", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Zod validation for invoice update fields
    const validation = validateRequest(invoiceUpdateSchema, sanitizedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return notFoundResponse("Invoice not found");
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, existing);
    if (orgError) return orgError;

    const validatedData = validation.data;

    // Validate invoice items if provided
    let subtotal: number = Number(existing.subtotal);
    let tax: number = Number(existing.tax);
    let total: number = Number(existing.total);

    let lineItems: z.infer<typeof invoiceItemUpdateSchema>[] | null = null;
    if (sanitizedBody.items && Array.isArray(sanitizedBody.items)) {
      const itemsValidation = z.array(invoiceItemUpdateSchema).safeParse(sanitizedBody.items);
      if (!itemsValidation.success) {
        return NextResponse.json(
          { error: "Invalid invoice items: " + itemsValidation.error.issues[0].message },
          { status: 400 }
        );
      }
      lineItems = itemsValidation.data;
      subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      tax = subtotal * TAX_RATE;
      total = subtotal + tax;
    }

    const newPaid = validatedData.paidAmount !== undefined ? validatedData.paidAmount : Number(existing.paidAmount);
    const newRemaining = total - newPaid;

    const invoice = await db.$transaction(async (tx) => {
      if (lineItems) {
        // Delete old items and create new ones atomically within the same transaction
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceItem.createMany({
          data: lineItems.map((item) => ({
            invoiceId: id,
            description: item.description || "",
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.total || (item.quantity * item.unitPrice),
          })),
        });
      }

      return await tx.invoice.update({
        where: { id },
        data: {
          ...(validatedData.number !== undefined && { number: validatedData.number }),
          ...(validatedData.clientId !== undefined && { clientId: validatedData.clientId }),
          ...(validatedData.projectId !== undefined && { projectId: validatedData.projectId }),
          ...(validatedData.issueDate !== undefined && { issueDate: new Date(validatedData.issueDate) }),
          ...(validatedData.dueDate !== undefined && { dueDate: new Date(validatedData.dueDate) }),
          ...(validatedData.status !== undefined && { status: validatedData.status as any }),
          subtotal,
          tax,
          total,
          paidAmount: newPaid,
          remaining: Math.max(0, newRemaining),
        },
        include: {
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, name: true, nameEn: true, number: true } },
          items: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    return NextResponse.json(invoice);
  } catch (error) {
    log.error("Error updating invoice:", error);
    return errorResponse("Failed to update invoice", "SERVER_ERROR", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return notFoundResponse("Invoice not found");
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, existing);
    if (orgError) return orgError;

    // Soft delete
    await db.invoice.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting invoice:", error);
    return errorResponse("Failed to delete invoice", "SERVER_ERROR", 500);
  }
}
