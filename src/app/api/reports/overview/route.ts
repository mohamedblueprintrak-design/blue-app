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

    // Active tasks (not done/cancelled)
    const activeTasks = await db.task.count({
      where: { status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] }, ...org },
    });

    // Total projects and tasks for context
    const totalProjects = await db.project.count({ where: org });
    const totalTasks = await db.task.count({ where: org });

    // Monthly revenue data (last 6 months)
    const now = new Date();
    const monthlyData: Array<{ monthAr: string; monthEn: string; monthIndex: number; year: number; revenue: number; expenses: number }> = [];

    const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
      };
    }, CACHE_TTL.REPORTS);

    return NextResponse.json(result);
  } catch (error) {
    log.error("Error fetching overview report:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
