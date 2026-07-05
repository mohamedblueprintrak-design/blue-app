import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { timingSafeEqual } from 'crypto';

/**
 * POST /api/cron/audit — Scan database for financial anomalies & trigger alerts
 *
 * Security: Requires CRON_SECRET authorization header.
 *
 * Features (Phase 4.3):
 * 1. Double Billing Detection: Flags duplicate payments with identical amounts, payMethods,
 *    and beneficiaries/references within a 7-day window.
 * 2. Abnormal Payment Delays: Flags unpaid invoices overdue by more than 60 days.
 * 3. Budget Variance audit: Flags project budgets exceeding planned cost allocation.
 * 4. Weekly Audit Notifications: Dispatches high-priority system alerts to administrators.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error('[Cron/Audit] CRON_SECRET not configured — audit endpoint disabled');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    log.security('[Cron/Audit] Unauthorized financial audit execution attempt', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const reportSummary: Record<string, {
    duplicatePayments: number;
    overdueInvoices: number;
    budgetOverruns: number;
  }> = {};

  try {
    // Retrieve all active organizations
    const organizations = await db.organization.findMany({
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      const orgId = org.id;
      reportSummary[orgId] = {
        duplicatePayments: 0,
        overdueInvoices: 0,
        budgetOverruns: 0,
      };

      // Find administrative/finance users who should receive audit alerts
      const admins = await db.user.findMany({
        where: {
          organizationId: orgId,
          role: { in: ['ADMIN', 'ACCOUNTANT'] },
        },
        select: { id: true },
      });

      if (admins.length === 0) continue;

      // ==========================================
      // 1. DOUBLE BILLING / DUPLICATE PAYMENTS SCAN
      // ==========================================
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentPayments = await db.payment.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: sevenDaysAgo },
          status: { not: 'cancelled' },
        },
        select: {
          id: true,
          amount: true,
          payMethod: true,
          beneficiary: true,
          referenceNumber: true,
          createdAt: true,
          projectId: true,
        },
      });

      // Find duplicate payments (same amount, payMethod, beneficiary/reference within a short window)
      const duplicateAlerts: Array<{ p1: string; p2: string; amount: number }> = [];
      for (let i = 0; i < recentPayments.length; i++) {
        for (let j = i + 1; j < recentPayments.length; j++) {
          const p1 = recentPayments[i];
          const p2 = recentPayments[j];

          const isSameAmount = p1.amount.toString() === p2.amount.toString();
          const isSameMethod = p1.payMethod === p2.payMethod;
          const isSameBeneficiary = p1.beneficiary.trim().toLowerCase() === p2.beneficiary.trim().toLowerCase() && p1.beneficiary.trim().length > 0;
          const isSameRef = p1.referenceNumber.trim().toLowerCase() === p2.referenceNumber.trim().toLowerCase() && p1.referenceNumber.trim().length > 0;

          if (isSameAmount && isSameMethod && (isSameBeneficiary || isSameRef)) {
            duplicateAlerts.push({
              p1: p1.id,
              p2: p2.id,
              amount: Number(p1.amount),
            });
          }
        }
      }

      reportSummary[orgId].duplicatePayments = duplicateAlerts.length;

      // Dispatch alert notifications for duplicate payments
      for (const alert of duplicateAlerts) {
        for (const admin of admins) {
          await db.notification.create({
            data: {
              userId: admin.id,
              organizationId: orgId,
              type: 'anomaly_duplicate_payment',
              title: 'تنبيه تدقيق: احتمال فوترة مزدوجة',
              titleEn: 'Audit Alert: Suspected Double Billing',
              message: `تم رصد عمليتي دفع بقيمة متطابقة (${alert.amount}) لنفس المستفيد. يرجى التحقق من أرقام السندات المعنية.`,
              messageEn: `Detected duplicate payments of (${alert.amount}) to the same beneficiary. Please verify voucher IDs: ${alert.p1} & ${alert.p2}.`,
              priority: 'high',
            },
          });
        }
      }

      // ==========================================
      // 2. ABNORMAL PAYMENT DELAYS SCAN
      // ==========================================
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const overdueInvoices = await db.invoice.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['sent', 'partially_paid'] },
          dueDate: { lt: sixtyDaysAgo },
          deletedAt: null,
        },
        select: {
          id: true,
          number: true,
          total: true,
          dueDate: true,
          projectId: true,
        },
      });

      reportSummary[orgId].overdueInvoices = overdueInvoices.length;

      // Dispatch alert notifications for highly delayed invoices
      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        for (const admin of admins) {
          await db.notification.create({
            data: {
              userId: admin.id,
              organizationId: orgId,
              projectId: invoice.projectId,
              type: 'anomaly_overdue_invoice',
              title: 'تنبيه تدقيق: تأخر غير طبيعي في سداد فاتورة',
              titleEn: 'Audit Alert: Highly Overdue Invoice',
              message: `الفاتورة رقم #${invoice.number} متأخرة عن السداد منذ ${daysOverdue} يوماً. القيمة المستحقة: ${invoice.total}.`,
              messageEn: `Invoice #${invoice.number} is outstanding for over ${daysOverdue} days. Total amount: ${invoice.total}.`,
              priority: 'medium',
            },
          });
        }
      }

      // ==========================================
      // 3. BUDGET OVERRUNS SCAN
      // ==========================================
      const budgetOverruns = await db.budget.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          planned: true,
          actual: true,
          projectId: true,
          project: { select: { name: true, nameEn: true } },
        },
      });

      const activeOverruns = budgetOverruns.filter(
        (b) => Number(b.actual) > Number(b.planned)
      );

      reportSummary[orgId].budgetOverruns = activeOverruns.length;

      // Dispatch alert notifications for budget overruns
      for (const budget of activeOverruns) {
        const excess = Number(budget.actual) - Number(budget.planned);
        const projectName = budget.project?.name || 'مجهول';
        const projectNameEn = budget.project?.nameEn || 'Unknown';

        for (const admin of admins) {
          await db.notification.create({
            data: {
              userId: admin.id,
              organizationId: orgId,
              projectId: budget.projectId,
              type: 'anomaly_budget_overrun',
              title: 'تنبيه تدقيق: تجاوز الميزانية المرصودة',
              titleEn: 'Audit Alert: Project Budget Overrun',
              message: `تجاوز البند "${budget.name}" في مشروع "${projectName}" الميزانية المخططة بمقدار ${excess.toFixed(2)}.`,
              messageEn: `Discipline "${budget.name}" under project "${projectNameEn}" exceeded planned budget by ${excess.toFixed(2)}.`,
              priority: 'high',
            },
          });
        }
      }

      // Log the audit summary inside the organization's system activity logs
      await db.activityLog.create({
        data: {
          organizationId: orgId,
          action: 'FINANCIAL_AI_AUDIT',
          details: `AI Audit run completed: detected ${reportSummary[orgId].duplicatePayments} potential double billing cases, ${reportSummary[orgId].overdueInvoices} highly overdue invoices, and ${reportSummary[orgId].budgetOverruns} budget overruns.`,
        },
      });
    }

    log.info('[Cron/Audit] Financial anomaly audit completed successfully', {
      timestamp: now.toISOString(),
      summary: reportSummary,
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      auditSummary: reportSummary,
    });
  } catch (error) {
    log.error('[Cron/Audit] Financial audit failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/audit — Get audit worker availability status
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ status: 'disabled' }, { status: 200 });
  }

  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: 'ready',
    auditType: 'FINANCIAL_ANOMALY_DETECTION',
    scanners: [
      'DOUBLE_BILLING_PREVENTION',
      'OVERDUE_PAYMENTS_ANALYSIS',
      'BUDGET_VARIANCE_AUDITOR',
    ],
  });
}
