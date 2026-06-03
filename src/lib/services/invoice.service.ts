// @ts-check
/**
 * Invoice Service
 * خدمة الفواتير
 * 
 * Business logic layer for invoice operations
 */

import { db } from '@/lib/db';
import { insensitiveContains } from '@/app/api/utils/db';
import { logAudit } from './audit.service';
import { Invoice, Prisma } from '@prisma/client';

/**
 * Invoice filtering options
 */
export interface InvoiceFilters {
  status?: string;
  clientId?: string;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Pagination parameters
 */
export interface InvoicePaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper
 */
export interface InvoicePaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create invoice input
 */
export interface CreateInvoiceInput {
  clientId?: string;
  projectId?: string;
  issueDate?: Date;
  dueDate?: Date;
  subtotal?: number;
  taxRate?: number;
  notes?: string;
}

/**
 * Invoice statistics
 */
export interface InvoiceStats {
  total: number;
  DRAFT: number;
  SENT: number;
  PAID: number;
  OVERDUE: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

/**
 * Invoice Service
 * Handles all business logic related to invoices
 */
class InvoiceService {
  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices(
    organizationId: string,
    filters?: InvoiceFilters,
    pagination?: InvoicePaginationParams
  ): Promise<InvoicePaginatedResult<Invoice>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    // Apply filters
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.projectId) where.projectId = filters.projectId;

    if (filters?.dateFrom || filters?.dateTo) {
      where.issueDate = {};
      if (filters?.dateFrom) (where.issueDate as Record<string, Date>).gte = filters.dateFrom;
      if (filters?.dateTo) (where.issueDate as Record<string, Date>).lte = filters.dateTo;
    }

    if (filters?.search) {
      where.OR = [
        { number: insensitiveContains(filters.search) },
      ];
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: pagination?.sortBy
          ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
          : { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string, organizationId: string): Promise<Invoice | null> {
    return db.invoice.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
      },
    });
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 3; attempt++) {
      const count = await db.invoice.count({
        where: {
          number: { startsWith: `INV-${year}` },
          organizationId,
        },
      });
      const invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
      // Check if this number already exists (race condition guard)
      const exists = await db.invoice.findFirst({
        where: { number: invoiceNumber, organizationId },
      });
      if (!exists) return invoiceNumber;
      // If exists due to concurrent request, retry with next iteration
    }
    // Fallback: use timestamp-based unique number after retries exhausted
    return `INV-${year}-${Date.now()}`;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    data: CreateInvoiceInput,
    organizationId: string,
    userId: string
  ): Promise<Invoice> {
    const subtotal = data.subtotal || 0;
    // Hardcoded fallback changed to use VAT_RATE constant from src/lib/constants.ts
    // Assuming VAT_RATE is 0.05, we multiply by 100 to get the percentage value (5)
    const { VAT_RATE } = await import('@/lib/constants');
    const defaultTaxRate = VAT_RATE * 100;
    const taxRate = data.taxRate ?? defaultTaxRate;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const invoiceNumber = await this.generateInvoiceNumber(organizationId);

        const invoice = await db.invoice.create({
          data: {
            number: invoiceNumber,
            organizationId,
            clientId: data.clientId || '',
            projectId: data.projectId || '',
            issueDate: data.issueDate || new Date(),
            dueDate: data.dueDate || new Date(),
            subtotal,
            taxRate,
            tax,
            total,
            paidAmount: 0,
            remaining: total,
            status: 'DRAFT',
          },
        });

        await logAudit({
          userId,
          organizationId,
          entityType: 'invoice',
          entityId: invoice.id,
          action: 'create',
          description: `تم إنشاء الفاتورة: ${invoice.number}`,
          metadata: { projectId: data.projectId, newValue: invoice },
        });

        return invoice;
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('invoice_number_org_unique')) {
          // Race condition occurred, another invoice took this number. Retry.
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Failed to generate a unique invoice number after multiple attempts.');
  }

  /**
   * Update invoice
   */
  async updateInvoice(
    id: string,
    data: Partial<Invoice>,
    organizationId: string,
    userId: string
  ): Promise<Invoice> {
    const oldInvoice = await db.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!oldInvoice) {
      throw new Error('Invoice not found or access denied');
    }

    // SECURITY: Explicit field whitelist to prevent Mass Assignment
    const allowedFields = ['clientId', 'projectId', 'issueDate', 'dueDate', 'subtotal', 'taxRate', 'tax', 'total', 'paidAmount', 'remaining', 'status'] as const;
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updateData[field] = (data as Record<string, unknown>)[field];
      }
    }

    // Recalculate totals if subtotal, tax rate, or paidAmount changed
    if (data.subtotal !== undefined || data.taxRate !== undefined || data.paidAmount !== undefined) {
      const subtotal = data.subtotal !== undefined ? Number(data.subtotal) : Number(oldInvoice.subtotal);
      const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : Number(oldInvoice.taxRate);
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax;
      const paidAmount = data.paidAmount !== undefined ? Number(data.paidAmount) : Number(oldInvoice.paidAmount);
      updateData.tax = tax;
      updateData.total = total;
      updateData.remaining = total - paidAmount;
    }

    await db.invoice.updateMany({
      where: { id, organizationId },
      data: updateData,
    });

    const invoice = await db.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new Error('Invoice not found or access denied');
    }

    await logAudit({
      userId,
      organizationId,
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'update',
      description: `تم تحديث الفاتورة: ${invoice.number}`,
      metadata: { projectId: invoice.projectId, oldValue: oldInvoice, newValue: invoice },
    });

    return invoice;
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(id: string, organizationId: string, userId: string): Promise<void> {
    const invoice = await db.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new Error('Invoice not found or access denied');
    }

    await db.invoice.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId,
      organizationId,
      entityType: 'invoice',
      entityId: id,
      action: 'delete',
      description: `تم حذف الفاتورة: ${invoice.number}`,
      metadata: { projectId: invoice.projectId, oldValue: invoice },
    });
  }

  /**
   * Mark invoice as sent
   */
  async markAsSent(id: string, organizationId: string, userId: string): Promise<Invoice> {
    return this.updateInvoice(id, { status: 'SENT' } as Partial<Invoice>, organizationId, userId);
  }

  /**
   * Record payment
   */
  async recordPayment(
    id: string,
    amount: number,
    organizationId: string,
    userId: string
  ): Promise<Invoice> {
    const invoice = await db.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new Error('Invoice not found or access denied');
    }

    const newPaidAmount = Number(invoice.paidAmount) + amount;
    const status = newPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';

    return this.updateInvoice(
      id,
      { paidAmount: new Prisma.Decimal(newPaidAmount), status: status as Invoice['status'] },
      organizationId,
      userId
    );
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(organizationId: string): Promise<InvoiceStats> {
    const [statusCounts, aggregates] = await Promise.all([
      db.invoice.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
        _sum: { total: true, paidAmount: true },
      }),
      db.invoice.aggregate({
        where: { organizationId },
        _sum: { total: true, paidAmount: true },
      }),
    ]) as [Array<{ status: string; _count: number; _sum: { total: number | null; paidAmount: number | null } }>, { _sum: { total: number | null; paidAmount: number | null } | null }];

    const stats: InvoiceStats = {
      total: 0,
      DRAFT: 0,
      SENT: 0,
      PAID: 0,
      OVERDUE: 0,
      totalAmount: aggregates._sum?.total || 0,
      paidAmount: aggregates._sum?.paidAmount || 0,
      outstandingAmount: (aggregates._sum?.total || 0) - (aggregates._sum?.paidAmount || 0),
    };

    // Get overdue count
    stats.OVERDUE = await db.invoice.count({
      where: {
        organizationId,
        status: { notIn: ['PAID', 'DRAFT', 'CANCELLED'] },
        dueDate: { lt: new Date() },
      },
    });

    for (const item of statusCounts) {
      stats.total += item._count;
      switch (item.status) {
        case 'DRAFT':
          stats.DRAFT = item._count;
          break;
        case 'SENT':
          stats.SENT = item._count;
          break;
        case 'PAID':
          stats.PAID = item._count;
          break;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();
