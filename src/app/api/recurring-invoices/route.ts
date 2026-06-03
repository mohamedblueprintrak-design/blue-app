import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { errorResponse } from '@/app/api/utils/response';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { calculateNextDate, type Frequency, type TemplateItem } from '@/lib/services/recurring-invoice.service';
import { VAT_RATE } from '@/lib/constants';
import { z } from 'zod';

// Validation schema for template items
const templateItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().nonnegative().max(999999999),
});

// Validation schema for creating a recurring invoice
const createRecurringInvoiceSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  templateItems: z.array(templateItemSchema).min(1),
  notes: z.string().max(2000).optional(),
  notesAr: z.string().max(2000).optional(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'CUSTOM']),
  customDays: z.number().int().min(1).max(365).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});

/**
 * GET /api/recurring-invoices
 * List all recurring invoices for the organization (RBAC: INVOICE_READ)
 */
export async function GET(request: NextRequest) {
  try {
    const rbac = requirePermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = { ...orgFilter(ctx) };

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const recurringInvoices = await db.recurringInvoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, nameEn: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        lastInvoice: { select: { id: true, number: true, status: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate template totals for each
    const enriched = recurringInvoices.map((ri) => {
      let items: TemplateItem[] = [];
      try {
        items = JSON.parse(ri.templateItems);
      } catch { /* ignore parse errors */ }

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const tax = subtotal * VAT_RATE;
      const total = subtotal + tax;

      return {
        ...ri,
        _computed: { subtotal, tax, total, itemCount: items.length },
      };
    });

    return NextResponse.json({ recurringInvoices: enriched });
  } catch (error) {
    log.error('Error fetching recurring invoices:', error);
    return errorResponse('Failed to fetch recurring invoices', 'SERVER_ERROR', 500);
  }
}

/**
 * POST /api/recurring-invoices
 * Create a new recurring invoice (RBAC: INVOICE_CREATE)
 */
export async function POST(request: NextRequest) {
  try {
    const rbac = requirePermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();

    // Validate input
    const validation = createRecurringInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0].message,
        'VALIDATION_ERROR',
        400,
      );
    }

    const data = validation.data;

    // Validate customDays is provided when frequency is CUSTOM
    if (data.frequency === 'CUSTOM' && (!data.customDays || data.customDays < 1)) {
      return errorResponse('customDays is required when frequency is CUSTOM', 'VALIDATION_ERROR', 400);
    }

    // Validate client exists
    const client = await db.client.findFirst({
      where: { id: data.clientId, ...orgFilter(ctx) },
    });
    if (!client) {
      return errorResponse('Client not found', 'NOT_FOUND', 404);
    }

    // Validate project exists (if provided)
    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, ...orgFilter(ctx) },
      });
      if (!project) {
        return errorResponse('Project not found', 'NOT_FOUND', 404);
      }
    }

    // Calculate nextGenerationDate based on startDate and frequency
    const startDate = new Date(data.startDate);
    const nextGenerationDate = calculateNextDate(
      startDate,
      data.frequency as Frequency,
      data.customDays,
    );

    const recurringInvoice = await db.recurringInvoice.create({
      data: {
        name: data.name,
        nameAr: data.nameAr || null,
        clientId: data.clientId,
        projectId: data.projectId || null,
        templateItems: JSON.stringify(data.templateItems),
        notes: data.notes || null,
        notesAr: data.notesAr || null,
        frequency: data.frequency,
        customDays: data.customDays || null,
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextGenerationDate: startDate <= new Date() ? startDate : nextGenerationDate,
        isActive: true,
        generationCount: 0,
        createdById: ctx.userId,
        ...orgCreate(ctx),
      },
      include: {
        client: { select: { id: true, name: true, nameEn: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    log.info('Recurring invoice created', { id: recurringInvoice.id, name: data.name, createdBy: ctx.userId });

    return NextResponse.json(recurringInvoice, { status: 201 });
  } catch (error) {
    log.error('Error creating recurring invoice:', error);
    return errorResponse('Failed to create recurring invoice', 'SERVER_ERROR', 500);
  }
}
