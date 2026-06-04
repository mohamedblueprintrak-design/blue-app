// @ts-nocheck
// @ts-check
/**
 * Recurring Invoice Service
 * خدمة الفواتير المتكررة
 *
 * Generates invoices automatically on a schedule (monthly, quarterly, annually, weekly, custom).
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { notificationService } from './notification.service';
import { VAT_RATE } from '@/lib/constants';

// ============================================
// Types
// ============================================

export type Frequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'CUSTOM';

export interface TemplateItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface GenerateResult {
  generated: number;
  errors: string[];
}

// ============================================
// Helpers
// ============================================

/**
 * Calculate the next generation date based on frequency
 */
export function calculateNextDate(currentDate: Date, frequency: Frequency, customDays?: number): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'ANNUALLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'CUSTOM':
      next.setDate(next.getDate() + (customDays || 30));
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}

/**
 * Generate invoice number: INV-YYYY-TIMESTAMP
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${Date.now()}`;
}

// ============================================
// Service
// ============================================

class RecurringInvoiceService {
  /**
   * Generate all due recurring invoices.
   * Called by the cron job periodically.
   *
   * Finds all active recurring invoices where nextGenerationDate <= now,
   * creates a new Invoice from the template items for each,
   * updates the recurring invoice state, and notifies the creator.
   *
   * Uses $transaction for atomicity per invoice.
   * Handles errors gracefully — one failure doesn't stop others.
   */
  async generateDueInvoices(): Promise<GenerateResult> {
    const now = new Date();
    let generated = 0;
    const errors: string[] = [];

    // Find all active recurring invoices that are due
    const dueRecurring = await db.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextGenerationDate: { lte: now },
        // Only include if endDate is null (forever) or hasn't passed
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, nameEn: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    log.info(`[RecurringInvoice] Found ${dueRecurring.length} due recurring invoices`);

    for (const recurring of dueRecurring) {
      try {
        // Parse template items
        let items: TemplateItem[] = [];
        try {
          items = JSON.parse(recurring.templateItems);
        } catch {
          errors.push(`RecurringInvoice ${recurring.id}: Invalid templateItems JSON`);
          continue;
        }

        if (!items.length) {
          errors.push(`RecurringInvoice ${recurring.id}: No template items`);
          continue;
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const tax = subtotal * VAT_RATE;
        const total = subtotal + tax;
        const invoiceNumber = generateInvoiceNumber();

        // Due date: 30 days from now
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 30);

        // Create invoice + update recurring in a transaction
        const result = await db.$transaction(async (tx) => {
          // Create the invoice
          const invoice = await tx.invoice.create({
            data: {
              number: invoiceNumber,
              clientId: recurring.clientId,
              projectId: recurring.projectId || '',
              issueDate: now,
              dueDate,
              subtotal,
              tax,
              taxRate: VAT_RATE * 100, // stored as percentage (5)
              total,
              paidAmount: 0,
              remaining: total,
              status: 'DRAFT',
              organizationId: recurring.organizationId,
              createdById: recurring.createdById,
              items: {
                create: items.map((item) => ({
                  description: item.description || '',
                  quantity: item.quantity || 0,
                  unitPrice: item.unitPrice || 0,
                  total: item.quantity * item.unitPrice,
                })),
              },
            },
            include: {
              items: true,
            },
          });

          // Calculate next generation date
          const nextDate = calculateNextDate(
            recurring.nextGenerationDate,
            recurring.frequency as Frequency,
            recurring.customDays ?? undefined,
          );

          // Update the recurring invoice
          await tx.recurringInvoice.update({
            where: { id: recurring.id },
            data: {
              lastGeneratedAt: now,
              lastInvoiceId: invoice.id,
              generationCount: recurring.generationCount + 1,
              nextGenerationDate: nextDate,
              // Auto-deactivate if endDate has passed
              isActive: recurring.endDate ? nextDate <= new Date(recurring.endDate) : true,
            },
          });

          return invoice;
        });

        generated++;

        // Notify the creator
        try {
          await notificationService.create({
            userId: recurring.createdById,
            type: 'SYSTEM_ALERT',
            titleAr: 'فاتورة متكررة جديدة',
            titleEn: 'New Recurring Invoice Generated',
            messageAr: `تم إنشاء فاتورة تلقائياً من "${recurring.name}" - ${result.number}`,
            messageEn: `Invoice auto-generated from "${recurring.name}" - ${result.number}`,
            projectId: recurring.projectId || undefined,
            relatedEntityType: 'invoice',
            relatedEntityId: result.id,
            organizationId: recurring.organizationId || undefined,
          });
        } catch (notifError) {
          // Notification failure is non-critical
          log.warn('[RecurringInvoice] Failed to send notification', notifError as Record<string, unknown>);
        }

        log.info(`[RecurringInvoice] Generated invoice ${result.number} from recurring ${recurring.id}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`RecurringInvoice ${recurring.id}: ${msg}`);
        log.error(`[RecurringInvoice] Error generating invoice for recurring ${recurring.id}`, error);
      }
    }

    log.info(`[RecurringInvoice] Generation complete: ${generated} generated, ${errors.length} errors`);
    return { generated, errors };
  }
}

// Export singleton instance
export const recurringInvoiceService = new RecurringInvoiceService();
