import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const result = await requireVerifiedPermission(request, Permission.REPORTS_READ);
  if ('error' in result) return result.error;
  const ctx = result.user;
  try {
    // Org filter for multi-tenant data isolation
    const orgWhere = orgFilter(ctx);

    // Invoice stats
    const invoiceStats = await db.invoice.aggregate({
      _sum: { paidAmount: true, remaining: true, total: true },
      where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
    });

    const collectedInvoices = invoiceStats._sum.paidAmount || 0;
    const _totalRemaining = invoiceStats._sum.remaining || 0;

    const pendingInvoices = await db.invoice.aggregate({
      _sum: { remaining: true },
      where: { status: { in: ["SENT", "PARTIALLY_PAID"] }, ...orgWhere },
    });

    const overdueInvoices = await db.invoice.aggregate({
      _sum: { remaining: true },
      where: { status: "OVERDUE", ...orgWhere },
    });

    const overdueCount = await db.invoice.count({
      where: { status: "OVERDUE", ...orgWhere },
    });

    // Top clients by revenue (sum of invoice totals per client)
    const clientRevenue = await db.invoice.groupBy({
      by: ["clientId"],
      _sum: { total: true, paidAmount: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
      where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
    });

    // Batch client lookup instead of N+1 per-client queries
    const clientIds = clientRevenue.map(cr => cr.clientId).filter(Boolean);
    const clients = await db.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true, company: true },
    });
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const topClients = clientRevenue.map(cr => {
      const client = clientMap.get(cr.clientId);
      return {
        clientId: cr.clientId,
        clientName: client?.name || "",
        clientCompany: client?.company || "",
        totalRevenue: cr._sum.total || 0,
        collectedAmount: cr._sum.paidAmount || 0,
        outstanding: Number(cr._sum.total || 0) - Number(cr._sum.paidAmount || 0),
      };
    });

    // Monthly revenue vs expenses (last 6 months)
    // Batch: 3 queries for the full 6-month range instead of 18 sequential queries
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const dateFilter = { gte: rangeStart, lte: rangeEnd };

    // Run 3 parallel queries covering the full 6-month range
    const [invoicedRows, collectedRows, expenseRows] = await Promise.all([
      db.invoice.findMany({
        where: { status: { not: "CANCELLED" }, createdAt: dateFilter, ...orgWhere },
        select: { createdAt: true, total: true },
      }),
      db.invoice.findMany({
        where: { status: { in: ["PAID", "PARTIALLY_PAID"] }, createdAt: dateFilter, ...orgWhere },
        select: { createdAt: true, paidAmount: true },
      }),
      db.payment.findMany({
        where: { status: "COMPLETED", createdAt: dateFilter, ...orgWhere },
        select: { createdAt: true, amount: true },
      }),
    ]);

    // Build month-keyed aggregation maps in memory
    type MonthKey = string; // "YYYY-MM"
    const invoicedByMonth = new Map<MonthKey, number>();
    const collectedByMonth = new Map<MonthKey, number>();
    const expensesByMonth = new Map<MonthKey, number>();

    function getMonthKey(date: Date): MonthKey {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    for (const inv of invoicedRows) {
      const key = getMonthKey(inv.createdAt);
      invoicedByMonth.set(key, (invoicedByMonth.get(key) || 0) + Number(inv.total || 0));
    }
    for (const inv of collectedRows) {
      const key = getMonthKey(inv.createdAt);
      collectedByMonth.set(key, (collectedByMonth.get(key) || 0) + Number(inv.paidAmount || 0));
    }
    for (const pay of expenseRows) {
      const key = getMonthKey(pay.createdAt);
      expensesByMonth.set(key, (expensesByMonth.get(key) || 0) + Number(pay.amount || 0));
    }

    const monthlyData: Array<{ monthAr: string; monthEn: string; monthIndex: number; year: number; invoiced: number; collected: number; expenses: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(monthStart);
      monthlyData.push({
        monthAr: arMonths[monthStart.getMonth()],
        monthEn: enMonths[monthStart.getMonth()],
        monthIndex: monthStart.getMonth(),
        year: monthStart.getFullYear(),
        invoiced: invoicedByMonth.get(key) || 0,
        collected: collectedByMonth.get(key) || 0,
        expenses: expensesByMonth.get(key) || 0,
      });
    }

    return NextResponse.json({
      collectedInvoices,
      pendingInvoices: pendingInvoices._sum.remaining || 0,
      overdueInvoices: overdueInvoices._sum.remaining || 0,
      overdueCount,
      topClients,
      monthlyData,
    });
  } catch (error) {
    log.error("Error fetching financial report:", error);
    return NextResponse.json({ error: "Failed to fetch financial report" }, { status: 500 });
  }
}
