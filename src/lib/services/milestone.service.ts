// @ts-check
/**
 * Milestone Service
 * خدمة مراحل الدفع
 *
 * Business logic layer for milestone-based payment operations.
 * Manages milestones as proper database records (replacing the legacy
 * paymentSchedule JSON field on the Project model).
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { createAuditEntry } from './audit-helper';
import { VAT_RATE } from '@/lib/constants';
import { Prisma } from '@prisma/client';

// ── Types ──────────────────────────────────────────────────────────────────

export type MilestoneStatus = 'pending' | 'invoiced' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface CreateMilestoneInput {
  projectId: string;
  name: string;
  description?: string;
  amount: number;
  percentage?: number;
  dueDate?: Date | string | null;
  order?: number;
  organizationId?: string | null;
  createdById?: string;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  amount?: number;
  percentage?: number;
  dueDate?: Date | string | null;
  status?: MilestoneStatus;
  order?: number;
  invoiceId?: string | null;
}

export interface MilestoneSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  invoicedAmount: number;
  totalMilestones: number;
  paidMilestones: number;
  pendingMilestones: number;
  overdueMilestones: number;
  totalPercentage: number;
}

// ── Valid milestone statuses ───────────────────────────────────────────────

const VALID_STATUSES: MilestoneStatus[] = ['pending', 'invoiced', 'partially_paid', 'paid', 'overdue', 'cancelled'];

function isValidStatus(status: string): status is MilestoneStatus {
  return VALID_STATUSES.includes(status as MilestoneStatus);
}

// ── Milestone Service Class ───────────────────────────────────────────────

class MilestoneService {
  /**
   * Get all milestones for a project, scoped to an organization.
   */
  async getMilestonesByProject(projectId: string, organizationId?: string | null) {
    const where: Record<string, unknown> = {
      projectId,
      deletedAt: null,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return db.milestone.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get a single milestone by ID with org scoping.
   */
  async getMilestoneById(id: string, organizationId?: string | null) {
    const where: Record<string, unknown> = { id, deletedAt: null };
    if (organizationId) where.organizationId = organizationId;

    return db.milestone.findFirst({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            number: true,
            clientId: true,
            contractValue: true,
            currency: true,
          },
        },
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Create a new milestone with validation.
   * Validates that total milestone percentages don't exceed 100%.
   */
  async createMilestone(data: CreateMilestoneInput) {
    const { projectId, name, description, amount, percentage, dueDate, order, organizationId, createdById } = data;

    // Verify the project exists
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, contractValue: true, organizationId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Org scoping check
    if (organizationId && project.organizationId && project.organizationId !== organizationId) {
      throw new Error('Access denied: project does not belong to your organization');
    }

    // Validate total percentage doesn't exceed 100%
    if (percentage !== undefined && percentage > 0) {
      const existingMilestones = await db.milestone.findMany({
        where: { projectId, deletedAt: null, status: { not: 'cancelled' } },
        select: { percentage: true },
      });
      const currentTotal = existingMilestones.reduce(
        (sum, m) => sum + Number(m.percentage),
        0
      );
      if (currentTotal + percentage > 100) {
        throw new Error(`Total milestone percentages would exceed 100%. Current: ${currentTotal}%, Adding: ${percentage}%`);
      }
    }

    // Determine the next order if not specified
    let milestoneOrder = order;
    if (milestoneOrder === undefined || milestoneOrder === null) {
      const maxOrder = await db.milestone.findFirst({
        where: { projectId, deletedAt: null },
        select: { order: true },
        orderBy: { order: 'desc' },
      });
      milestoneOrder = (maxOrder?.order ?? -1) + 1;
    }

    const milestone = await db.milestone.create({
      data: {
        projectId,
        name,
        description: description || '',
        amount: new Prisma.Decimal(amount),
        percentage: new Prisma.Decimal(percentage || 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'pending',
        order: milestoneOrder,
        organizationId: organizationId || null,
        createdById: createdById || null,
      },
      include: {
        project: {
          select: { id: true, name: true, number: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    if (createdById) {
      await createAuditEntry({
        action: 'create',
        entityType: 'milestone',
        entityId: milestone.id,
        userId: createdById,
        projectId,
        organizationId: organizationId || null,
        newValues: {
          name,
          amount: Number(milestone.amount),
          percentage: Number(milestone.percentage),
          status: milestone.status,
        },
        details: `Milestone created: ${name} (${amount} AED)`,
      });
    }

    log.info('Milestone created', { milestoneId: milestone.id, projectId, name, amount });

    return milestone;
  }

  /**
   * Update a milestone with validation.
   */
  async updateMilestone(id: string, data: UpdateMilestoneInput, userId?: string, organizationId?: string | null) {
    // Fetch existing milestone
    const existing = await this.getMilestoneById(id, organizationId);
    if (!existing) {
      throw new Error('Milestone not found or access denied');
    }

    // Validate status transition
    if (data.status && !isValidStatus(data.status)) {
      throw new Error(`Invalid milestone status: ${data.status}`);
    }

    // Prevent changing status of paid milestones
    if (existing.status === 'paid' && data.status && data.status !== 'paid') {
      throw new Error('Cannot change status of a paid milestone');
    }

    // Validate percentage doesn't exceed 100% when updating
    if (data.percentage !== undefined && data.percentage > 0) {
      const otherMilestones = await db.milestone.findMany({
        where: {
          projectId: existing.projectId,
          deletedAt: null,
          status: { not: 'cancelled' },
          id: { not: id },
        },
        select: { percentage: true },
      });
      const othersTotal = otherMilestones.reduce(
        (sum, m) => sum + Number(m.percentage),
        0
      );
      if (othersTotal + data.percentage > 100) {
        throw new Error(`Total milestone percentages would exceed 100%. Other milestones: ${othersTotal}%, Updating to: ${data.percentage}%`);
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
    if (data.percentage !== undefined) updateData.percentage = new Prisma.Decimal(data.percentage);
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.invoiceId !== undefined) updateData.invoiceId = data.invoiceId;

    await db.milestone.update({
      where: { id },
      data: updateData,
    });

    const updated = await this.getMilestoneById(id, organizationId);

    // Audit log
    if (userId) {
      await createAuditEntry({
        action: 'update',
        entityType: 'milestone',
        entityId: id,
        userId,
        projectId: existing.projectId,
        organizationId: organizationId || null,
        oldValues: {
          name: existing.name,
          amount: Number(existing.amount),
          percentage: Number(existing.percentage),
          status: existing.status,
        },
        newValues: updateData,
        details: `Milestone updated: ${data.name || existing.name}`,
      });
    }

    log.info('Milestone updated', { milestoneId: id, updatedFields: Object.keys(updateData) });

    return updated;
  }

  /**
   * Soft delete a milestone.
   * Prevents deletion of paid or invoiced milestones.
   */
  async deleteMilestone(id: string, userId?: string, organizationId?: string | null) {
    const existing = await this.getMilestoneById(id, organizationId);
    if (!existing) {
      throw new Error('Milestone not found or access denied');
    }

    // Prevent deletion of paid or invoiced milestones
    if (existing.status === 'paid' || existing.status === 'invoiced') {
      throw new Error(`Cannot delete a ${existing.status} milestone. Please cancel or reverse the invoice first.`);
    }

    await db.milestone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    if (userId) {
      await createAuditEntry({
        action: 'delete',
        entityType: 'milestone',
        entityId: id,
        userId,
        projectId: existing.projectId,
        organizationId: organizationId || null,
        oldValues: {
          name: existing.name,
          amount: Number(existing.amount),
          status: existing.status,
        },
        details: `Milestone deleted: ${existing.name}`,
      });
    }

    log.info('Milestone soft-deleted', { milestoneId: id, name: existing.name });

    return { success: true, deletedId: id };
  }

  /**
   * Generate an invoice from a milestone.
   * Auto-populates client, project, amount from the milestone and project data.
   */
  async generateInvoiceFromMilestone(milestoneId: string, userId?: string, organizationId?: string | null) {
    const milestone = await this.getMilestoneById(milestoneId, organizationId);
    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }

    // Check if milestone already has an invoice
    if (milestone.invoiceId) {
      throw new Error('This milestone already has an associated invoice');
    }

    // Check milestone status
    if (milestone.status === 'paid' || milestone.status === 'cancelled') {
      throw new Error(`Cannot generate invoice for a ${milestone.status} milestone`);
    }

    const project = milestone.project;

    // Generate invoice number
    const year = new Date().getFullYear();
    const orgId = organizationId || '';
    let invoiceNumber: string;
    for (let attempt = 0; attempt < 3; attempt++) {
      const count = await db.invoice.count({
        where: {
          number: { startsWith: `INV-${year}` },
          organizationId: orgId || undefined,
        },
      });
      invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
      const exists = await db.invoice.findFirst({
        where: { number: invoiceNumber, organizationId: orgId || undefined },
      });
      if (!exists) break;
    }
    // Fallback
    invoiceNumber = invoiceNumber! || `INV-${year}-${Date.now()}`;

    const amount = Number(milestone.amount);
    const taxRate = VAT_RATE * 100; // 5%
    const tax = amount * VAT_RATE;
    const total = amount + tax;
    const dueDate = milestone.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now if no due date

    // Create the invoice with a single line item for the milestone
    const invoice = await db.invoice.create({
      data: {
        number: invoiceNumber,
        clientId: project.clientId,
        projectId: project.id,
        issueDate: new Date(),
        dueDate,
        subtotal: amount,
        taxRate: new Prisma.Decimal(taxRate),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),
        paidAmount: new Prisma.Decimal(0),
        remaining: new Prisma.Decimal(total),
        status: 'draft',
        organizationId: organizationId || null,
        createdById: userId || null,
        items: {
          create: [
            {
              description: milestone.name + (milestone.description ? ` — ${milestone.description}` : ''),
              quantity: new Prisma.Decimal(1),
              unitPrice: new Prisma.Decimal(amount),
              total: new Prisma.Decimal(amount),
            },
          ],
        },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, number: true } },
        items: true,
      },
    });

    // Link the invoice to the milestone and update status
    await db.milestone.update({
      where: { id: milestoneId },
      data: {
        invoiceId: invoice.id,
        status: 'invoiced',
      },
    });

    // Audit log
    if (userId) {
      await createAuditEntry({
        action: 'create',
        entityType: 'invoice',
        entityId: invoice.id,
        userId,
        projectId: project.id,
        organizationId: organizationId || null,
        newValues: {
          number: invoice.number,
          total: Number(invoice.total),
          milestoneId,
          milestoneName: milestone.name,
        },
        details: `Invoice generated from milestone: ${milestone.name} (${amount} AED)`,
      });
    }

    log.info('Invoice generated from milestone', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      milestoneId,
      total,
    });

    return invoice;
  }

  /**
   * Recalculate milestone amounts based on the project's contract value.
   * Updates each milestone's `amount` field based on its `percentage` of the contract value.
   */
  async recalculateMilestones(projectId: string, organizationId?: string | null) {
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, contractValue: true, organizationId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (organizationId && project.organizationId && project.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    const contractValue = Number(project.contractValue);
    if (contractValue <= 0) {
      throw new Error('Contract value must be greater than zero to recalculate milestones');
    }

    const milestones = await db.milestone.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { order: 'asc' },
    });

    const updates = [];
    for (const milestone of milestones) {
      const percentage = Number(milestone.percentage);
      if (percentage > 0) {
        const newAmount = (contractValue * percentage) / 100;
        updates.push(
          db.milestone.update({
            where: { id: milestone.id },
            data: { amount: new Prisma.Decimal(newAmount) },
          })
        );
      }
    }

    await Promise.all(updates);

    log.info('Milestones recalculated', {
      projectId,
      contractValue,
      milestoneCount: milestones.length,
      updatedCount: updates.length,
    });

    return { recalculated: updates.length, contractValue };
  }

  /**
   * Check for overdue milestones and mark them.
   * Intended for use in a cron job.
   * Returns the count of newly overdue milestones.
   */
  async checkOverdueMilestones(organizationId?: string | null) {
    const now = new Date();

    const where: Record<string, unknown> = {
      deletedAt: null,
      status: { in: ['pending', 'invoiced'] },
      dueDate: { lt: now, not: null },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const overdueMilestones = await db.milestone.findMany({
      where,
      select: { id: true, name: true, projectId: true },
    });

    if (overdueMilestones.length === 0) {
      return { markedOverdue: 0 };
    }

    const ids = overdueMilestones.map(m => m.id);

    await db.milestone.updateMany({
      where: { id: { in: ids } },
      data: { status: 'overdue' },
    });

    log.info('Milestones marked as overdue', {
      count: ids.length,
      milestoneIds: ids,
    });

    return { markedOverdue: ids.length, milestoneIds: ids };
  }

  /**
   * Get a summary of milestones for a project.
   */
  async getMilestoneSummary(projectId: string, organizationId?: string | null): Promise<MilestoneSummary> {
    const where: Record<string, unknown> = {
      projectId,
      deletedAt: null,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const milestones = await db.milestone.findMany({
      where,
      select: {
        amount: true,
        percentage: true,
        status: true,
      },
    });

    const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalPercentage = milestones.reduce((sum, m) => sum + Number(m.percentage), 0);
    const paidAmount = milestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const invoicedAmount = milestones
      .filter(m => m.status === 'invoiced' || m.status === 'partially_paid')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const pendingAmount = totalAmount - paidAmount - invoicedAmount;

    return {
      totalAmount,
      paidAmount,
      pendingAmount: Math.max(pendingAmount, 0),
      invoicedAmount,
      totalMilestones: milestones.length,
      paidMilestones: milestones.filter(m => m.status === 'paid').length,
      pendingMilestones: milestones.filter(m => m.status === 'pending').length,
      overdueMilestones: milestones.filter(m => m.status === 'overdue').length,
      totalPercentage,
    };
  }
}

// Export singleton instance
export const milestoneService = new MilestoneService();
