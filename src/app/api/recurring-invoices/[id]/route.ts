import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, orgFilter } from '@/app/api/utils/auth';
import { errorResponse, notFoundResponse } from '@/app/api/utils/response';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { calculateNextDate, type Frequency } from '@/lib/services/recurring-invoice.service';
import { z } from 'zod';

// Validation schema for updating a recurring invoice
const updateRecurringInvoiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().optional().nullable(),
  templateItems: z.string().optional(), // JSON string
  notes: z.string().max(2000).optional().nullable(),
  notesAr: z.string().max(2000).optional().nullable(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'CUSTOM']).optional(),
  customDays: z.number().int().min(1).max(365).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/recurring-invoices/[id]
 * Get a single recurring invoice (RBAC: INVOICE_READ)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = requirePermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const recurringInvoice = await db.recurringInvoice.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        client: { select: { id: true, name: true, nameEn: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        lastInvoice: { select: { id: true, number: true, status: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!recurringInvoice) {
      return notFoundResponse();
    }

    return NextResponse.json(recurringInvoice);
  } catch (error) {
    log.error('Error fetching recurring invoice:', error);
    return errorResponse('Failed to fetch recurring invoice', 'SERVER_ERROR', 500);
  }
}

/**
 * PUT /api/recurring-invoices/[id]
 * Update a recurring invoice — pause, change frequency, etc. (RBAC: INVOICE_UPDATE)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = requirePermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    // Check existence
    const existing = await db.recurringInvoice.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existing) {
      return notFoundResponse();
    }

    const body = await request.json();
    const validation = updateRecurringInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0].message,
        'VALIDATION_ERROR',
        400,
      );
    }

    const data = validation.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.templateItems !== undefined) updateData.templateItems = data.templateItems;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.notesAr !== undefined) updateData.notesAr = data.notesAr;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.customDays !== undefined) updateData.customDays = data.customDays;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    // Handle isActive toggle (pause/resume)
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;

      // If reactivating, recalculate nextGenerationDate
      if (data.isActive && !existing.isActive) {
        const freq = (data.frequency || existing.frequency) as Frequency;
        const customDays = data.customDays ?? existing.customDays ?? undefined;
        const baseDate = new Date();
        updateData.nextGenerationDate = calculateNextDate(baseDate, freq, customDays);
      }
    }

    // If frequency changed, recalculate nextGenerationDate
    if (data.frequency !== undefined && data.frequency !== existing.frequency) {
      const freq = data.frequency as Frequency;
      const customDays = data.customDays ?? existing.customDays ?? undefined;
      const baseDate = existing.lastGeneratedAt || new Date();
      updateData.nextGenerationDate = calculateNextDate(baseDate, freq, customDays);
    }

    const updated = await db.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, nameEn: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    log.info('Recurring invoice updated', { id, updatedBy: ctx.userId });

    return NextResponse.json(updated);
  } catch (error) {
    log.error('Error updating recurring invoice:', error);
    return errorResponse('Failed to update recurring invoice', 'SERVER_ERROR', 500);
  }
}

/**
 * DELETE /api/recurring-invoices/[id]
 * Soft delete by setting isActive = false (RBAC: INVOICE_DELETE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = requirePermission(request, Permission.INVOICE_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const existing = await db.recurringInvoice.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existing) {
      return notFoundResponse();
    }

    // Soft delete: set isActive = false
    await db.recurringInvoice.update({
      where: { id },
      data: { isActive: false },
    });

    log.info('Recurring invoice deactivated (soft delete)', { id, deletedBy: ctx.userId });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    log.error('Error deleting recurring invoice:', error);
    return errorResponse('Failed to delete recurring invoice', 'SERVER_ERROR', 500);
  }
}
