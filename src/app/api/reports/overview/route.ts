import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { cachedQuery, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

export async function GET(request: NextRequest) {
  try {
    // AUTH CHECK — overview contains financial data
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;
    const org = orgFilter(user);

    const cacheKey = buildCacheKey('reports', 'overview', user.organizationId || 'global');

    const result = await cachedQuery(cacheKey, async () => {
      // Revenue: sum of paid invoices
      const revenueResult = await db.invoice.aggregate({
        _sum: { paidAmount: true },
        where: org,
      });

      // Expenses: sum of completed payments
      const expensesResult = await db.payment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", ...org },
      });

      const revenue = Number(revenueResult._sum.paidAmount || 0);
      const expenses = Number(expensesResult._sum.amount || 0);
      const profit = revenue - expenses;

      // Completed projects
      const completedProjects = await db.project.count({
        where: { status: "COMPLETED", ...org },
      });

      // Active tasks
      const activeTasks = await db.task.count({
        where: { status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] }, ...org },
      });

      // Total projects and tasks
      const totalProjects = await db.project.count({ where: org });
      const totalTasks = await db.task.count({ where: org });

      // 1. Bank Accounts Cash Balance
      const bankAccountsResult = await db.bankAccount.aggregate({
        _sum: { currentBalance: true },
        where: { isActive: true, ...org }
      });
      const cashBalance = Number(bankAccountsResult._sum.currentBalance || 0);

      // 2. AR Outstanding
      const arResult = await db.invoice.aggregate({
        _sum: { remaining: true },
        where: { status: { not: "DRAFT" }, deletedAt: null, ...org }
      });
      const arOutstanding = Number(arResult._sum.remaining || 0);

      // 3. AP Outstanding (from approved purchase orders)
      const apResult = await db.purchaseOrder.aggregate({
        _sum: { amount: true },
        where: { status: { in: ["approved", "received"] }, deletedAt: null, ...org }
      });
      const apOutstanding = Number(apResult._sum.amount || 0);

      // 4. AR Aging calculation
      const unpaidInvoices = await db.invoice.findMany({
        where: { status: { not: "DRAFT" }, remaining: { gt: 0 }, deletedAt: null, ...org },
        select: { remaining: true, issueDate: true }
      });

      let arCurrent = 0;
      let ar30 = 0;
      let ar60 = 0;
      let ar90 = 0;
      const today = new Date();

      for (const inv of unpaidInvoices) {
        const remaining = Number(inv.remaining);
        const ageInDays = Math.floor(
          (today.getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (ageInDays <= 30) {
          arCurrent += remaining;
        } else if (ageInDays <= 60) {
          ar30 += remaining;
        } else if (ageInDays <= 90) {
          ar60 += remaining;
        } else {
          ar90 += remaining;
        }
      }

      // 5. Timeline construction
      const recentInvoices = await db.invoice.findMany({
        where: { deletedAt: null, ...org },
        orderBy: { issueDate: "desc" },
        take: 5,
        select: { id: true, number: true, total: true, issueDate: true, status: true, client: { select: { name: true } } }
      });

      const recentPayments = await db.payment.findMany({
        where: org,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, amount: true, createdAt: true, status: true, invoice: { select: { number: true } } }
      });

      const timeline: Array<{
        id: string;
        date: Date;
        type: "INFLOW" | "OUTFLOW" | "PENDING";
        title: string;
        amount: number;
        status: string;
      }> = [];

      for (const inv of recentInvoices) {
        timeline.push({
          id: inv.id,
          date: new Date(inv.issueDate),
          type: inv.status === "PAID" ? "INFLOW" : "PENDING",
          title: `فاتورة مبيعات ${inv.number} - ${inv.client?.name || ""}`,
          amount: Number(inv.total),
          status: inv.status
        });
      }

      for (const pay of recentPayments) {
        timeline.push({
          id: pay.id,
          date: new Date(pay.createdAt),
          type: pay.status === "COMPLETED" ? "INFLOW" : "PENDING",
          title: `دفعة مستلمة للفاتورة ${pay.invoice?.number || ""}`,
          amount: Number(pay.amount),
          status: pay.status
        });
      }

      // Sort timeline descending
      timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

      // 6. Action items / Alerts
      const alertsList = [];
      const overdueInvoiceCount = await db.invoice.count({
        where: {
          organizationId: user.organizationId as string,
          deletedAt: null,
          status: { notIn: ["DRAFT", "PAID"] },
          dueDate: { lt: new Date() }
        }
      });
      if (overdueInvoiceCount > 0) {
        alertsList.push({
          type: "WARNING",
          messageAr: `يوجد ${overdueInvoiceCount} فواتير عملاء متأخرة السداد`,
          messageEn: `There are ${overdueInvoiceCount} overdue client invoices`
        });
      }

      // Add standard VAT alert
      alertsList.push({
        type: "INFO",
        messageAr: "تذكير: الإقرار الضريبي للربع الحالي مستحق قريباً",
        messageEn: "Reminder: Current quarter VAT Return is due soon"
      });

      // Monthly revenue data (last 6 months)
      const monthlyData: Array<{ monthAr: string; monthEn: string; monthIndex: number; year: number; revenue: number; expenses: number }> = [];

      const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const monthRevenue = await db.invoice.aggregate({
          _sum: { paidAmount: true },
          where: {
            status: { in: ["PAID", "PARTIALLY_PAID"] },
            createdAt: { gte: monthStart, lte: monthEnd },
            ...org,
          },
        });

        const monthExpenses = await db.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: "COMPLETED",
            createdAt: { gte: monthStart, lte: monthEnd },
            ...org,
          },
        });

        monthlyData.push({
          monthAr: arMonths[monthStart.getMonth()],
          monthEn: enMonths[monthStart.getMonth()],
          monthIndex: monthStart.getMonth(),
          year: monthStart.getFullYear(),
          revenue: Number(monthRevenue._sum.paidAmount || 0),
          expenses: Number(monthExpenses._sum.amount || 0),
        });
      }

      return {
        revenue,
        expenses,
        profit,
        completedProjects,
        activeTasks,
        totalProjects,
        totalTasks,
        monthlyData,
        cashBalance,
        arOutstanding,
        apOutstanding,
        arAging: {
          current: arCurrent,
          days30: ar30,
          days60: ar60,
          days90: ar90
        },
        timeline: timeline.slice(0, 8),
        alerts: alertsList
      };
    }, CACHE_TTL.REPORTS);

    return NextResponse.json(result);
  } catch (error) {
    log.error("Error fetching overview report:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
