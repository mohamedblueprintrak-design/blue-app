import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { getCompanyCurrency } from '@/lib/currency-server';

// ============================================
// Budget vs Actual Comparison
// ============================================

interface CategoryComparison {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  variancePercent: number;
  status: "on_track" | "at_risk" | "over_budget";
}

interface MonthlyComparison {
  month: string;
  budgeted: number;
  spent: number;
}

interface BudgetAlert {
  type: "over_budget" | "at_risk" | "info";
  category: string;
  message: string;
}

interface BudgetComparisonResponse {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  variancePercent: number;
  categories: CategoryComparison[];
  monthly: MonthlyComparison[];
  alerts: BudgetAlert[];
}

function getStatus(spentRatio: number): "on_track" | "at_risk" | "over_budget" {
  if (spentRatio > 1.0) return "over_budget";
  if (spentRatio >= 0.8) return "at_risk";
  return "on_track";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    // Verify project exists and belongs to org
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null, ...orgFilter(ctx) },
      select: { id: true, budget: true, contractValue: true, startDate: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch budget items (planned)
    const budgetItems = await db.budget.findMany({
      where: { projectId, deletedAt: null, ...orgFilter(ctx) },
      select: {
        id: true,
        category: true,
        name: true,
        planned: true,
        actual: true,
        committed: true,
        remaining: true,
        deviation: true,
        parentId: true,
      },
    });

    // Fetch invoices for this project (actual spending)
    const invoices = await db.invoice.findMany({
      where: { projectId, deletedAt: null, ...orgFilter(ctx) },
      select: {
        id: true,
        total: true,
        paidAmount: true,
        issueDate: true,
        status: true,
        items: {
          select: { description: true, total: true },
        },
      },
    });

    // Fetch payments for this project
    // NOTE: Payment.status is UPPERCASE (PENDING/APPROVED/COMPLETED/CANCELLED —
    // see migration 20260901000000_payment_status_normalize); the old lowercase
    // "completed" literal matched nothing after normalization.
    const payments = await db.payment.findMany({
      where: { projectId, status: "COMPLETED", ...orgFilter(ctx) },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        description: true,
      },
    });

    // Calculate total budget from budget items (top-level only, no parent)
    const topLevelBudgetItems = budgetItems.filter(b => !b.parentId);

    // If no budget items exist, use project budget
    const effectiveTotalBudget = topLevelBudgetItems.length > 0
      ? topLevelBudgetItems.reduce((sum, b) => sum + Number(b.planned), 0)
      : Number(project.budget);

    // Calculate total spent from completed payments
    const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate total paid from invoices
    const totalPaidInvoices = invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);

    // Use the higher of paid invoices vs completed payments as actual spending
    const effectiveTotalSpent = Math.max(totalSpent, totalPaidInvoices);

    const totalRemaining = effectiveTotalBudget - effectiveTotalSpent;
    const variancePercent = effectiveTotalBudget > 0
      ? Number((((effectiveTotalBudget - effectiveTotalSpent) / effectiveTotalBudget) * 100).toFixed(1))
      : 0;

    // Build category comparisons
    const categories: CategoryComparison[] = [];

    if (budgetItems.length > 0) {
      // Group by category
      const categoryMap = new Map<string, { planned: number; actual: number }>();

      for (const item of budgetItems) {
        const cat = item.category || "general";
        const existing = categoryMap.get(cat) || { planned: 0, actual: 0 };
        existing.planned += Number(item.planned);
        existing.actual += Number(item.actual);
        categoryMap.set(cat, existing);
      }

      for (const [category, data] of categoryMap) {
        const spentRatio = data.planned > 0 ? data.actual / data.planned : 0;
        const remaining = data.planned - data.actual;
        const varPercent = data.planned > 0
          ? Number(((remaining / data.planned) * 100).toFixed(1))
          : 0;

        categories.push({
          category,
          budgeted: data.planned,
          spent: data.actual,
          remaining,
          variancePercent: varPercent,
          status: getStatus(spentRatio),
        });
      }
    } else {
      // No budget items — create a single overall category
      const spentRatio = effectiveTotalBudget > 0 ? effectiveTotalSpent / effectiveTotalBudget : 0;
      categories.push({
        category: "overall",
        budgeted: effectiveTotalBudget,
        spent: effectiveTotalSpent,
        remaining: effectiveTotalBudget - effectiveTotalSpent,
        variancePercent,
        status: getStatus(spentRatio),
      });
    }

    // Build monthly comparisons
    const monthlyMap = new Map<string, { budgeted: number; spent: number }>();

    // Monthly budget distribution (even distribution across project duration)
    if (project.startDate) {
      const start = new Date(project.startDate);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
      const monthlyBudget = effectiveTotalBudget / Math.max(monthsDiff, 1);

      for (let i = 0; i < Math.min(monthsDiff, 12); i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap.set(key, { budgeted: monthlyBudget, spent: 0 });
      }
    }

    // Monthly spending from payments
    for (const payment of payments) {
      const date = new Date(payment.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) || { budgeted: 0, spent: 0 };
      existing.spent += Number(payment.amount);
      monthlyMap.set(key, existing);
    }

    // Monthly spending from invoices (if no payments for that month)
    for (const invoice of invoices) {
      if (Number(invoice.paidAmount) > 0) {
        const date = new Date(invoice.issueDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const existing = monthlyMap.get(key) || { budgeted: 0, spent: 0 };
        // Only add if payments don't already cover this
        if (existing.spent === 0) {
          existing.spent += Number(invoice.paidAmount);
          monthlyMap.set(key, existing);
        }
      }
    }

    const monthly: MonthlyComparison[] = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // Build alerts
    const companyCurrency = await getCompanyCurrency(ctx.organizationId);
    const alerts: BudgetAlert[] = [];

    for (const cat of categories) {
      if (cat.status === "over_budget") {
        alerts.push({
          type: "over_budget",
          category: cat.category,
          message: `${cat.category} is over budget by ${Math.abs(cat.remaining).toLocaleString()} ${companyCurrency} (${Math.abs(cat.variancePercent)}% over)`,
        });
      } else if (cat.status === "at_risk") {
        alerts.push({
          type: "at_risk",
          category: cat.category,
          message: `${cat.category} is at risk — ${((cat.spent / cat.budgeted) * 100).toFixed(0)}% of budget spent`,
        });
      }
    }

    if (categories.length === 0) {
      alerts.push({
        type: "info",
        category: "general",
        message: "No budget items defined for this project. Add budget categories to track spending.",
      });
    }

    const response: BudgetComparisonResponse = {
      totalBudget: effectiveTotalBudget,
      totalSpent: effectiveTotalSpent,
      totalRemaining,
      variancePercent,
      categories,
      monthly,
      alerts,
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error("Error fetching budget comparison:", error);
    return NextResponse.json({ error: "Failed to fetch budget comparison" }, { status: 500 });
  }
}
