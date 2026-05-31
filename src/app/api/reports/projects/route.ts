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
    const orgWhere = orgFilter(ctx);
    // Project stats by status
    const totalProjects = await db.project.count({ where: orgWhere });
    const activeProjects = await db.project.count({ where: { status: "ACTIVE", ...orgWhere } });
    const completedProjects = await db.project.count({ where: { status: "COMPLETED", ...orgWhere } });
    const delayedProjects = await db.project.count({ where: { status: "DELAYED", ...orgWhere } });
    const onHoldProjects = await db.project.count({ where: { status: "ON_HOLD", ...orgWhere } });
    const cancelledProjects = await db.project.count({ where: { status: "CANCELLED", ...orgWhere } });

    // Project details with progress and budget
    const projects = await db.project.findMany({
      where: orgWhere,
      select: {
        id: true,
        number: true,
        name: true,
        nameEn: true,
        status: true,
        progress: true,
        budget: true,
        startDate: true,
        endDate: true,
        client: { select: { name: true, company: true } },
        tasks: { select: { status: true } },
        invoices: { select: { total: true, paidAmount: true } },
        payments: { select: { amount: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Budget vs Actual comparison per project
    const projectBudgetData = projects.map((p) => {
      const totalInvoiced = p.invoices.reduce((s, i) => s + Number(i.total), 0);
      const totalPaid = p.payments.filter((py) => py.status === "COMPLETED").reduce((s, py) => s + Number(py.amount), 0);
      const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
      const totalTasks = p.tasks.length;
      const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        number: p.number,
        name: p.name,
        nameEn: p.nameEn,
        status: p.status,
        progress: p.progress,
        budget: p.budget,
        totalInvoiced,
        totalPaid,
        completedTasks,
        totalTasks,
        taskProgress,
        clientName: p.client?.name || "",
        clientCompany: p.client?.company || "",
      };
    });

    // Overall budget summary
    const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
    const totalInvoiced = projectBudgetData.reduce((s, p) => s + p.totalInvoiced, 0);
    const totalSpent = projectBudgetData.reduce((s, p) => s + p.totalPaid, 0);

    return NextResponse.json({
      stats: {
        total: totalProjects,
        ACTIVE: activeProjects,
        COMPLETED: completedProjects,
        DELAYED: delayedProjects,
        onHold: onHoldProjects,
        CANCELLED: cancelledProjects,
      },
      budgetSummary: {
        totalBudget,
        totalInvoiced,
        totalSpent,
        remaining: totalBudget - totalSpent,
      },
      projects: projectBudgetData,
    });
  } catch (error) {
    log.error("Error fetching projects report:", error);
    return NextResponse.json({ error: "Failed to fetch projects report" }, { status: 500 });
  }
}
