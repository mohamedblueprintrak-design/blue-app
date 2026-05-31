import { NextRequest, NextResponse } from 'next/server';
import {
  generateFinancialReportPDF,
  generateProjectReportPDF,
  generateTaskReportPDF,
  generateClientReportPDF,
  generateInvoiceReportPDF,
} from '@/lib/pdf/pdf-generator';
import { log } from '@/lib/logger';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgFilter, type AuthContext } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { db } from '@/lib/db';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import type {
  FinancialReportData,
  ProjectReportData,
  TaskReportData,
  ClientReportData,
  InvoiceReportData,
} from '@/lib/pdf/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { allowed: _allowed, result } = await withRateLimit(request, 'export');
    const blocked = rateLimitResponse(result);
    if (blocked) return blocked;

    // AUTH CHECK — reports require REPORTS_EXPORT permission
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_EXPORT);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const lang = (searchParams.get('lang') as 'ar' | 'en') || 'ar';

    let pdfBuffer: Buffer;
    let filename: string;

    switch (type) {
      case 'financial':
        ({ pdfBuffer, filename } = await generateFinancialReport(lang, user));
        break;
      case 'projects':
        ({ pdfBuffer, filename } = await generateProjectReport(lang, user));
        break;
      case 'tasks':
        ({ pdfBuffer, filename } = await generateTaskReport(lang, user));
        break;
      case 'clients':
        ({ pdfBuffer, filename } = await generateClientReport(lang, user));
        break;
      case 'invoices':
        ({ pdfBuffer, filename } = await generateInvoiceReport(lang, user));
        break;
      default:
        return NextResponse.json(
          { error: `Unknown report type: ${type}. Valid types: financial, projects, tasks, clients, invoices` },
          { status: 400 }
        );
    }

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error: unknown) {
    log.error('Error generating report PDF:', error);
    return handleApiError(error, 'ReportPDF');
  }
}

async function generateFinancialReport(lang: 'ar' | 'en', user: AuthContext) {
  const org = orgFilter(user);

  const invoiceStats = await db.invoice.aggregate({
    _sum: { total: true, paidAmount: true },
    where: org,
  });

  const pendingSum = await db.invoice.aggregate({
    _sum: { remaining: true },
    where: { status: { in: ['SENT', 'PARTIALLY_PAID'] }, ...org },
  });

  const overdueSum = await db.invoice.aggregate({
    _sum: { remaining: true },
    where: { status: 'OVERDUE', ...org },
  });

  // Monthly data
  const now = new Date();
  const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rows: FinancialReportData['rows'] = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const invoiced = await db.invoice.aggregate({
      _sum: { total: true },
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: monthStart, lte: monthEnd }, ...org },
    });

    const paid = await db.invoice.aggregate({
      _sum: { paidAmount: true },
      where: { status: { in: ['PAID', 'PARTIALLY_PAID'] }, createdAt: { gte: monthStart, lte: monthEnd }, ...org },
    });

    const pending = await db.invoice.aggregate({
      _sum: { remaining: true },
      where: { status: { in: ['SENT', 'PARTIALLY_PAID'] }, ...org },
    });

    rows.push({
      date: lang === 'ar' ? arMonths[monthStart.getMonth()] : enMonths[monthStart.getMonth()],
      invoiced: Number(invoiced._sum.total || 0),
      paid: Number(paid._sum.paidAmount || 0),
      pending: Number(pending._sum.remaining || 0),
    });
  }

  const data: FinancialReportData = {
    title: lang === 'ar' ? 'التقرير المالي' : 'Financial Report',
    dateRange: new Date().toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-US'),
    summary: {
      totalInvoiced: Number(invoiceStats._sum.total || 0),
      totalPaid: Number(invoiceStats._sum.paidAmount || 0),
      totalPending: Number(pendingSum._sum.remaining || 0),
      totalOverdue: Number(overdueSum._sum.remaining || 0),
    },
    rows,
    currency: 'AED',
    language: lang,
  };

  return {
    pdfBuffer: await generateFinancialReportPDF(data),
    filename: `financial-report-${Date.now()}.pdf`,
  };
}

async function generateProjectReport(lang: 'ar' | 'en', user: AuthContext) {
  const org = orgFilter(user);

  const projects = await db.project.findMany({
    where: org,
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVE').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    pending: projects.filter(p => p.status === 'ON_HOLD').length,
    onHold: projects.filter(p => p.status === 'ON_HOLD').length,
  };

  const data: ProjectReportData = {
    title: lang === 'ar' ? 'تقرير المشاريع' : 'Project Report',
    dateRange: new Date().toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-US'),
    summary: stats,
    projects: projects.map(p => ({
      name: lang === 'ar' ? p.name : (p.nameEn || p.name),
      client: p.client.name,
      status: p.status,
      progress: p.progress,
      budget: Number(p.budget),
    })),
    language: lang,
  };

  return {
    pdfBuffer: await generateProjectReportPDF(data),
    filename: `project-report-${Date.now()}.pdf`,
  };
}

async function generateTaskReport(lang: 'ar' | 'en', user: AuthContext) {
  const org = orgFilter(user);

  const tasks = await db.task.findMany({
    where: org,
    include: {
      assignee: { select: { name: true } },
      project: { select: { name: true, nameEn: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
  };

  const data: TaskReportData = {
    title: lang === 'ar' ? 'تقرير المهام' : 'Task Report',
    dateRange: new Date().toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-US'),
    summary: stats,
    tasks: tasks.map(t => ({
      title: t.title || '-',
      project: lang === 'ar' ? (t.project?.name || '-') : (t.project?.nameEn || t.project?.name || '-'),
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : '-',
      assignee: t.assignee?.name ?? undefined,
    })),
    language: lang,
  };

  return {
    pdfBuffer: await generateTaskReportPDF(data),
    filename: `task-report-${Date.now()}.pdf`,
  };
}

async function generateClientReport(lang: 'ar' | 'en', user: AuthContext) {
  const org = orgFilter(user);

  const clients = await db.client.findMany({
    where: { deletedAt: null, ...org },
    include: {
      invoices: {
        select: { total: true, paidAmount: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = clients.reduce((sum, c) => sum + c.invoices.reduce((s, inv) => s + Number(inv.total), 0), 0);

  const data: ClientReportData = {
    title: lang === 'ar' ? 'تقرير العملاء' : 'Client Report',
    dateRange: new Date().toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-US'),
    summary: {
      total: clients.length,
      active: clients.filter(c => c.invoices.length > 0).length,
      totalRevenue,
    },
    clients: clients.map(c => ({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      company: c.company || "",
      totalInvoiced: c.invoices.reduce((s, inv) => s + Number(inv.total), 0),
      totalPaid: c.invoices.reduce((s, inv) => s + Number(inv.paidAmount), 0),
    })),
    currency: 'AED',
    language: lang,
  };

  return {
    pdfBuffer: await generateClientReportPDF(data),
    filename: `client-report-${Date.now()}.pdf`,
  };
}

async function generateInvoiceReport(lang: 'ar' | 'en', user: AuthContext) {
  const org = orgFilter(user);

  const invoices = await db.invoice.findMany({
    where: { deletedAt: null, ...org },
    include: {
      client: { select: { name: true } },
      project: { select: { name: true, nameEn: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter(inv => inv.status === 'PAID').length,
    pending: invoices.filter(inv => ['SENT', 'PARTIALLY_PAID'].includes(inv.status)).length,
    overdue: invoices.filter(inv => inv.status === 'OVERDUE').length,
  };

  const data: InvoiceReportData = {
    title: lang === 'ar' ? 'تقرير الفواتير' : 'Invoice Report',
    dateRange: new Date().toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-US'),
    summary: stats,
    invoices: invoices.map(inv => ({
      invoiceNumber: inv.number,
      client: inv.client.name,
      project: lang === 'ar' ? inv.project?.name : (inv.project?.nameEn || inv.project?.name),
      total: Number(inv.total),
      paidAmount: Number(inv.paidAmount),
      status: inv.status,
      issueDate: new Date(inv.issueDate).toLocaleDateString('en-GB'),
      dueDate: new Date(inv.dueDate).toLocaleDateString('en-GB'),
    })),
    currency: 'AED',
    language: lang,
  };

  return {
    pdfBuffer: await generateInvoiceReportPDF(data),
    filename: `invoice-report-${Date.now()}.pdf`,
  };
}
