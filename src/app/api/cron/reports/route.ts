import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { timingSafeEqual } from 'crypto';
import { generateFinancialReportPDF, FinancialReportData } from '@/lib/pdf/pdf-generator';
import { getCompanyCurrency } from '@/lib/currency-server';
import { sendEmail } from '@/lib/email';

/**
 * GET / POST /api/cron/reports — Email weekly PDF report updates to admins & general managers
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 * Call with: curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/reports
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error('[Cron Reports] CRON_SECRET not configured — weekly reports disabled');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    log.security('[Cron Reports] Unauthorized reports trigger attempt', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results: Array<{ organizationId: string; emailedCount: number; status: string }> = [];

  try {
    // 1. Retrieve all active organizations
    const organizations = await db.organization.findMany({
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      try {
        const orgId = org.id;

        // 2. Retrieve admins, managers, and accountants for this organization
        const recipients = await db.user.findMany({
          where: {
            organizationId: orgId,
            role: { in: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
          },
          select: { email: true, name: true },
        });

        if (recipients.length === 0) {
          results.push({ organizationId: orgId, emailedCount: 0, status: 'No recipients' });
          continue;
        }

        // 3. Gather weekly report metrics from the DB
        // Total Invoiced
        const invoiceStats = await db.invoice.aggregate({
          where: { organizationId: orgId },
          _sum: { total: true, paidAmount: true },
        });

        // Total Pending
        const pendingSum = await db.invoice.aggregate({
          where: {
            organizationId: orgId,
            status: { in: ['SENT', 'PARTIALLY_PAID'] },
          },
          _sum: { remaining: true },
        });

        // Total Overdue (due date in past and status is not fully paid)
        const overdueSum = await db.invoice.aggregate({
          where: {
            organizationId: orgId,
            status: { in: ['SENT', 'PARTIALLY_PAID'] },
            dueDate: { lt: now },
          },
          _sum: { remaining: true },
        });

        const currency = await getCompanyCurrency(orgId);

        // Fetch monthly summary rows for the PDF graph/data
        const rows: Array<{ date: string; invoiced: number; paid: number; pending: number }> = [];
        const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Aggregate last 3 months
        for (let i = 2; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

          const invoicedM = await db.invoice.aggregate({
            where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd } },
            _sum: { total: true },
          });

          const paidM = await db.invoice.aggregate({
            where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd }, status: 'PAID' },
            _sum: { paidAmount: true },
          });

          const pendingM = await db.invoice.aggregate({
            where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd }, status: { in: ['SENT', 'PARTIALLY_PAID'] } },
            _sum: { remaining: true },
          });

          rows.push({
            date: enMonths[monthStart.getMonth()],
            invoiced: Number(invoicedM._sum.total || 0),
            paid: Number(paidM._sum.paidAmount || 0),
            pending: Number(pendingM._sum.remaining || 0),
          });
        }

        const reportData: FinancialReportData = {
          title: 'Weekly Financial Summary Report',
          dateRange: `Week of ${now.toLocaleDateString('en-US')}`,
          summary: {
            totalInvoiced: Number(invoiceStats._sum.total || 0),
            totalPaid: Number(invoiceStats._sum.paidAmount || 0),
            totalPending: Number(pendingSum._sum.remaining || 0),
            totalOverdue: Number(overdueSum._sum.remaining || 0),
          },
          rows,
          currency,
          language: 'en',
        };

        // 4. Generate the PDF report buffer
        const pdfBuffer = await generateFinancialReportPDF(reportData);

        // 5. Send emails to recipients with the PDF attached
        let emailCount = 0;
        for (const recipient of recipients) {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f172a;">Weekly Financial Report Update</h2>
              <p>Hello ${recipient.name},</p>
              <p>Please find attached the weekly financial and operational status report for <strong>${org.name}</strong>, compiled by BluePrint AI Audit Engine.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Total Invoiced</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${currency} ${reportData.summary.totalInvoiced.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Total Paid</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #10b981;">${currency} ${reportData.summary.totalPaid.toLocaleString()}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Outstanding Pending</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #f59e0b;">${currency} ${reportData.summary.totalPending.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Overdue Invoices</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #ef4444;">${currency} ${reportData.summary.totalOverdue.toLocaleString()}</td>
                </tr>
              </table>
              <p>For more detailed breakdowns, please log in to your <a href="https://blue-app.blueprint.ae/dashboard" style="color: #0284c7; text-decoration: none; font-weight: bold;">BluePrint ERP Dashboard</a>.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 11px; color: #64748b;">This email was automatically generated by the BluePrint scheduler system. Please do not reply directly to this message.</p>
            </div>
          `;

          await sendEmail({
            to: recipient.email,
            subject: `[BluePrint ERP] Weekly Financial Status Update — ${org.name}`,
            html: emailHtml,
            attachments: [
              {
                filename: `weekly-financial-report-${now.toISOString().slice(0, 10)}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });
          emailCount++;
        }

        // Record activity log entry for the weekly cron execution
        await db.activityLog.create({
          data: {
            organizationId: orgId,
            action: 'WEEKLY_PDF_REPORTS_SENT',
            entityType: 'REPORT',
            entityId: 'SYSTEM',
            details: `Successfully generated and emailed weekly financial reports to ${emailCount} admins`,
            userId: null, // SYSTEM
          },
        });

        results.push({ organizationId: orgId, emailedCount: emailCount, status: 'Success' });
      } catch (orgError) {
        log.error(`[Cron Reports] Failed to process weekly reports for organization ${org.id}:`, orgError);
        results.push({ organizationId: org.id, emailedCount: 0, status: `Failed: ${orgError instanceof Error ? orgError.message : 'Unknown error'}` });
      }
    }

    log.info('[Cron Reports] Weekly scheduled PDF reports completed', { results });
    return NextResponse.json({ success: true, timestamp: now.toISOString(), results });
  } catch (error) {
    log.error('[Cron Reports] Scheduled task execution failed:', error);
    return NextResponse.json({ success: false, error: 'Scheduled task failed', results }, { status: 500 });
  }
}

// Support GET for status check
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
    task: 'Weekly Scheduled PDF Report Builder',
  });
}
