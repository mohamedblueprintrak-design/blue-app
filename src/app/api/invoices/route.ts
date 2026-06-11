import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { invoiceSchema } from '@/lib/validations';
import { sanitizeObject } from '@/lib/security/sanitize';
import { requireVerifiedPermission, orgFilter } from '../utils/auth';
import { errorResponse } from '../utils/response';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';
import { z } from 'zod';
import { Permission } from '@/lib/auth/types';
import { cacheDeletePattern } from '@/lib/cache/redis';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { log } from '@/lib/logger';

// Tax rate handled by invoiceService
import { invoiceService } from '@/lib/services/invoice.service';

// Zod schema for invoice line items validation
const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().nonnegative().max(999999999),
  total: z.number().nonnegative().optional(),
});

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: List invoices
 *     description: Retrieve a paginated list of invoices scoped to the user's organization. Includes client, project, and line item details. Requires INVOICE_READ permission.
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by invoice number or client name
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED]
 *         description: Filter by invoice status
 *       - name: clientId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by client ID
 *       - name: projectId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *     responses:
 *       200:
 *         description: Paginated list of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       number:
 *                         type: string
 *                       status:
 *                         type: string
 *                       subtotal:
 *                         type: number
 *                       tax:
 *                         type: number
 *                       total:
 *                         type: number
 *                       remaining:
 *                         type: number
 *                       paidAmount:
 *                         type: number
 *                       issueDate:
 *                         type: string
 *                         format: date-time
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                       client:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           company: { type: string }
 *                       project:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           nameEn: { type: string }
 *                           number: { type: string }
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             description: { type: string }
 *                             quantity: { type: number }
 *                             unitPrice: { type: number }
 *                             total: { type: number }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing INVOICE_READ permission
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting — API limiter (100 req/min per IP)
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;

    // Search filter
    if (search) {
      where.OR = [
        { number: insensitiveContains(search) },
        { client: { name: insensitiveContains(search) } },
      ];
    }

    const cacheKey = buildCacheKey('invoices', 'list', ctx.organizationId || 'global', `p${page}`, `l${limit}`, status || '', clientId || '', projectId || '', search || '');

    const { invoices, total } = await cachedQuery(cacheKey, async () => {
      const [invoices, total] = await Promise.all([
        db.invoice.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          include: {
            client: { select: { id: true, name: true, company: true, phone: true } },
            project: { select: { id: true, name: true, nameEn: true, number: true } },
            items: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.invoice.count({ where }),
      ]);
      return { invoices, total };
    }, CACHE_TTL.INVOICES);

    return NextResponse.json({ data: invoices, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("Error fetching invoices:", error);
    return errorResponse("Failed to fetch invoices", "SERVER_ERROR", 500);
  }
}

/**
 * @openapi
 * /api/invoices:
 *   post:
 *     tags: [Invoices]
 *     summary: Create invoice
 *     description: Create a new invoice with line items. Requires INVOICE_CREATE permission. Tax is automatically calculated at 5% (UAE VAT, configurable). Dashboard cache is invalidated after creation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, projectId, issueDate, dueDate, items]
 *             properties:
 *               number:
 *                 type: string
 *                 description: Invoice number (auto-generated if empty)
 *                 example: "INV-2025-001"
 *               clientId:
 *                 type: string
 *                 description: Client ID
 *               projectId:
 *                 type: string
 *                 description: Project ID
 *               issueDate:
 *                 type: string
 *                 format: date
 *                 description: Invoice issue date
 *                 example: "2025-01-15"
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: Invoice due date
 *                 example: "2025-02-15"
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED]
 *                 default: DRAFT
 *                 description: Invoice status
 *               items:
 *                 type: array
 *                 description: Line items for the invoice
 *                 items:
 *                   type: object
 *                   required: [description, quantity, unitPrice]
 *                   properties:
 *                     description:
 *                       type: string
 *                       maxLength: 500
 *                       description: Item description
 *                       example: "Structural design review - Phase 1"
 *                     quantity:
 *                       type: number
 *                       exclusiveMinimum: 0
 *                       maximum: 999999
 *                       description: Quantity
 *                       example: 1
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 999999999
 *                       description: Unit price in AED
 *                       example: 15000
 *                     total:
 *                       type: number
 *                       description: Line total (defaults to quantity × unitPrice)
 *     responses:
 *       201:
 *         description: Invoice created successfully with calculated tax
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Created invoice with client, project, and line items
 *       400:
 *         description: Validation error (invalid items, missing fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing INVOICE_CREATE permission
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const rawBody = await request.json();

    // 1. Zod validation for invoice fields (BEFORE sanitization)
    const validation = invoiceSchema.safeParse(rawBody);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, "VALIDATION_ERROR", 400);
    }
    
    // 2. Use validated data for DB operations (sanitizeObject can corrupt numeric/enum fields)
    const validatedData = validation.data;
    const { number: _number, clientId, projectId, issueDate, dueDate, status } = validatedData;

    // Validate invoice line items with Zod
    const rawItems = (rawBody as Record<string, unknown>).items;
    const itemsValidation = z.array(invoiceItemSchema).safeParse(rawItems);
    if (!itemsValidation.success) {
      return NextResponse.json(
        { error: "Invalid invoice items: " + itemsValidation.error.issues[0].message },
        { status: 400 }
      );
    }
    
    // Sanitize the validated items
    const lineItems = itemsValidation.data.map(item => sanitizeObject(item as unknown as Record<string, unknown>)) as unknown as typeof itemsValidation.data;

    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    // tax is calculated inside createInvoice dynamically from DB settings
    const invoice = await invoiceService.createInvoice(
      {
        clientId,
        projectId,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        items: lineItems.map((item) => ({
          description: item.description || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          total: item.total || (item.quantity * item.unitPrice),
        }))
      },
      ctx.organizationId || "",
      ctx.userId
    );

    // If a custom status or number was provided (for migration/testing), we could update it, 
    // but typically creation defaults to DRAFT.
    if (status && status !== 'DRAFT') {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status }
      });
      invoice.status = status;
    }

    // Invalidate dashboard and invoice caches after invoice creation
    await cacheDeletePattern(`dashboard:${ctx.organizationId || 'global'}:*`);
    await invalidateCache('invoices');

    log.info("Invoice created", { invoiceId: invoice.id, number: invoice.number, total: invoice.total, createdBy: ctx.userId });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    log.error("Error creating invoice:", error);
    return errorResponse("Failed to create invoice", "SERVER_ERROR", 500);
  }
}
