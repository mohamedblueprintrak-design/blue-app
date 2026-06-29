// @ts-check
/**
 * Site Log Cost Service
 * خدمة تكلفة سجل الموقع وتكامل جدول الكميات
 * 
 * This service calculates costs from site log items, compares them against
 * BOQ budgets, and provides variance analysis for project cost tracking.
 */

import { db, isDatabaseAvailable } from '@/lib/db';

// Extended database client type for models not yet in the Prisma schema
// These models (siteReport, siteLogItem) are defined in the schema but
// the Prisma client hasn't been regenerated. Use specific types for type safety.

interface SiteLogItemRecord {
  id: string;
  siteReportId: string;
  boqItemId: string | null;
  quantity: number;
  unitPrice: number;
  boqItem?: { id: string; category: string | null } | null;
  siteReport?: { status: string; projectId: string } | null;
}

interface SiteReportRecord {
  id: string;
  projectId: string;
  status: string;
  logItems?: SiteLogItemRecord[];
}

/** BOQ item with included siteLogItems from Prisma query */
interface BoqItemWithSiteLogItems {
  siteLogItems?: Array<{
    siteReport?: { status: string };
    quantity: number;
    unitPrice: number;
  }>;
}

type ExtendedPrismaClient = typeof db & {
  siteReport: {
    findUnique: (args: { where: { id: string }; select?: Record<string, boolean> }) => Promise<{ id: string; projectId: string } | null>;
    findMany: (args: { where?: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<SiteReportRecord[]>;
  };
  siteLogItem: {
    findUnique: (args: { where: { id: string }; include?: Record<string, unknown> }) => Promise<SiteLogItemRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<SiteLogItemRecord[]>;
  };
};
const extDb = db as ExtendedPrismaClient;

// ============================================
// Types
// ============================================

export interface SiteLogCostSummary {
  siteReportId: string;
  totalCost: number;
  itemsCount: number;
  byCategory: Record<string, number>;
}

export interface BOQVarianceItem {
  boqItemId: string;
  itemNumber: string | null;
  description: string;
  category: string | null;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  isOverBudget: boolean;
  flagged: boolean; // >20% variance
  unit: string | null;
  budgetQuantity: number;
  actualQuantity: number;
}

export interface BOQVarianceReport {
  projectId: string;
  projectName: string;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
  items: BOQVarianceItem[];
  flaggedCount: number;
  overBudgetCount: number;
}

export interface BOQUpdateResult {
  boqItemId: string;
  siteLogItemId: string;
  previousActual: number;
  newActual: number;
  updated: boolean;
}

// ============================================
// Service Functions
// ============================================

/**
 * Calculate total cost from all SiteLogItems for a site report.
 * Returns: { totalCost, itemsCount, byCategory: { civil: X, STRUCTURAL: Y, ... } }
 */
export async function calculateSiteLogCost(
  siteReportId: string
): Promise<SiteLogCostSummary> {
  const defaultResult: SiteLogCostSummary = {
    siteReportId,
    totalCost: 0,
    itemsCount: 0,
    byCategory: {},
  };

  if (!await isDatabaseAvailable()) return defaultResult;

  // Verify site report exists
  const siteReport = await extDb.siteReport.findUnique({
    where: { id: siteReportId },
    select: { id: true, projectId: true },
  });

  if (!siteReport) {
    throw new Error(`Site report not found: ${siteReportId}`);
  }

  // Fetch all log items with their linked BOQ items for category info
  const logItems = await extDb.siteLogItem.findMany({
    where: { siteReportId },
    include: {
      boqItem: {
        select: {
          category: true,
        },
      },
    },
  });

  let totalCost = 0;
  const byCategory: Record<string, number> = {};

  for (const item of logItems) {
    const itemCost = item.quantity * item.unitPrice;
    totalCost += itemCost;

    // Determine category from linked BOQ item or default to 'uncategorized'
    const category = item.boqItem?.category || 'uncategorized';
    byCategory[category] = (byCategory[category] || 0) + itemCost;
  }

  return {
    siteReportId,
    totalCost: Math.round(totalCost * 100) / 100,
    itemsCount: logItems.length,
    byCategory,
  };
}

/**
 * Get BOQ Variance Report for a project.
 * Compares BOQItem budgets vs actual SiteLogItem costs.
 * Returns array: { boqItemId, description, budget, actual, variance, variancePercent }
 * Flags items with >20% variance.
 */
export async function getBOQVariance(
  projectId: string
): Promise<BOQVarianceReport> {
  const defaultResult: BOQVarianceReport = {
    projectId,
    projectName: '',
    totalBudget: 0,
    totalActual: 0,
    totalVariance: 0,
    totalVariancePercent: 0,
    items: [],
    flaggedCount: 0,
    overBudgetCount: 0,
  };

  if (!await isDatabaseAvailable()) return defaultResult;

  // Verify project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Get all BOQ items for the project with their linked site log items
  const boqItems = await db.bOQItem.findMany({
    where: { projectId },
  });

  const items: BOQVarianceItem[] = [];
  let totalBudget = 0;
  let totalActual = 0;
  let flaggedCount = 0;
  let overBudgetCount = 0;

  for (const boqItem of boqItems) {
    // Calculate actual cost from all linked site log items
    // Only count items from submitted or approved site reports
    const siteLogItems = (boqItem as BoqItemWithSiteLogItems).siteLogItems;
    const activeLogItems = siteLogItems
      ? siteLogItems.filter(
          (li) => li.siteReport && (li.siteReport.status === 'SUBMITTED' || li.siteReport.status === 'APPROVED')
        )
      : [];

    const actualCost = activeLogItems.reduce(
      (sum, li) => sum + (li.quantity * li.unitPrice),
      0
    );

    const actualQuantity = activeLogItems.reduce(
      (sum, li) => sum + li.quantity,
      0
    );

    const budget = Number(boqItem.total) || (Number(boqItem.quantity) * Number(boqItem.unitPrice));
    const variance = Number(budget) - Number(actualCost);
    const variancePercent = Number(budget) !== 0 ? (Number(variance) / Number(budget)) * 100 : 0;
    
    const isOverBudget = variance < 0;
    const flagged = Math.abs(variancePercent) > 20;

    if (isOverBudget) overBudgetCount++;
    if (flagged) flaggedCount++;

    totalBudget += Number(budget);
    totalActual += actualCost;

    items.push({
      boqItemId: boqItem.id,
      itemNumber: boqItem.itemNumber,
      description: boqItem.description || '',
      category: boqItem.category,
      budget: Math.round(budget * 100) / 100,
      actual: Math.round(actualCost * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercent: Math.round(variancePercent * 100) / 100,
      isOverBudget,
      flagged,
      unit: boqItem.unit,
      budgetQuantity: Number(boqItem.quantity),
      actualQuantity: Math.round(actualQuantity * 1000) / 1000,
    });
  }

  const totalVariance = Number(totalBudget) - Number(totalActual);
  const totalVariancePercent = Number(totalBudget) !== 0
    ? (Number(totalVariance) / Number(totalBudget)) * 100
    : 0;

  return {
    projectId,
    projectName: project.name,
    totalBudget: Math.round(totalBudget * 100) / 100,
    totalActual: Math.round(totalActual * 100) / 100,
    totalVariance: Math.round(totalVariance * 100) / 100,
    totalVariancePercent: Math.round(totalVariancePercent * 100) / 100,
    items,
    flaggedCount,
    overBudgetCount,
  };
}

/**
 * Update BOQ cost tracking when a site log item is linked to a BOQ item.
 * When a site log item is linked to a BOQ item, recalculate the actual cost
 * tracked against that BOQ item.
 */
export async function updateBOQFromSiteLog(
  siteLogItemId: string
): Promise<BOQUpdateResult> {
  const defaultResult: BOQUpdateResult = {
    boqItemId: '',
    siteLogItemId,
    previousActual: 0,
    newActual: 0,
    updated: false,
  };

  if (!await isDatabaseAvailable()) return defaultResult;

  // Get the site log item with its BOQ link and related project site reports
  const siteLogItem = await extDb.siteLogItem.findUnique({
    where: { id: siteLogItemId },
    include: {
      boqItem: {
        select: {
          id: true,
          category: true,
        },
      },
      siteReport: {
        select: {
          projectId: true,
          status: true,
        },
      },
    },
  });

  if (!siteLogItem) {
    throw new Error(`Site log item not found: ${siteLogItemId}`);
  }

  if (!siteLogItem.boqItem) {
    // No BOQ link — nothing to update
    return {
      ...defaultResult,
      boqItemId: '',
    };
  }

  const boqItemId = siteLogItem.boqItem?.id || '';

  // Calculate previous actual cost (before this item's contribution)
  // We get all other linked items for this BOQ item
  const allLinkedItems = await extDb.siteLogItem.findMany({
    where: {
      boqItemId,
      id: { not: siteLogItemId },
    },
    include: {
      siteReport: {
        select: { status: true },
      },
    },
  });

  // Sum costs from approved/submitted reports only
  const previousActual = allLinkedItems
    .filter((li) => li.siteReport?.status === 'SUBMITTED' || li.siteReport?.status === 'APPROVED')
    .reduce((sum, li) => sum + (Number(li.quantity) * Number(li.unitPrice)), 0);

  // New actual includes the current item (if its report is submitted/approved)
  const isItemActive =
    siteLogItem.siteReport?.status === 'SUBMITTED' ||
    siteLogItem.siteReport?.status === 'APPROVED';

  const newItemCost = isItemActive
    ? Number(siteLogItem.quantity) * Number(siteLogItem.unitPrice)
    : 0;

  const newActual = previousActual + newItemCost;

  // We don't need to update the BOQItem itself since actual costs are
  // calculated dynamically from site log items. However, we can store
  // a tracking note in the BOQ item's notes field.
  // For now, we just return the comparison data.
  return {
    boqItemId,
    siteLogItemId,
    previousActual: Math.round(previousActual * 100) / 100,
    newActual: Math.round(newActual * 100) / 100,
    updated: previousActual !== newActual,
  };
}

/**
 * Get cost summary across all site reports for a project
 */
export async function getProjectCostSummary(projectId: string): Promise<{
  projectId: string;
  totalBudget: number;
  totalSiteLogCost: number;
  overallVariance: number;
  overallVariancePercent: number;
  reportCount: number;
  byCategory: Record<string, { budget: number; actual: number; variance: number }>;
}> {
  const defaultResult = {
    projectId,
    totalBudget: 0,
    totalSiteLogCost: 0,
    overallVariance: 0,
    overallVariancePercent: 0,
    reportCount: 0,
    byCategory: {} as Record<string, { budget: number; actual: number; variance: number }>,
  };

  if (!await isDatabaseAvailable()) return defaultResult;

  // Get BOQ totals
  const boqItems = await db.bOQItem.findMany({
    where: { projectId },
  });

  const totalBudget = boqItems.reduce(
    (sum, item) => sum + Number(item.total || (Number(item.quantity) * Number(item.unitPrice))),
    0
  );

  // Get all site log items for the project
  const siteReports = await extDb.siteReport.findMany({
    where: {
      projectId,
      status: { in: ['SUBMITTED', 'APPROVED'] },
    },
    include: {
      logItems: {
        include: {
          boqItem: {
            select: { category: true },
          },
        },
      },
    },
  });

  let totalSiteLogCost = 0;
  const byCategory: Record<string, { budget: number; actual: number; variance: number }> = {};

  // Calculate budget by category
  for (const boqItem of boqItems) {
    const cat = boqItem.category || 'uncategorized';
    if (!byCategory[cat]) {
      byCategory[cat] = { budget: 0, actual: 0, variance: 0 };
    }
    byCategory[cat].budget += Number(boqItem.total) || (Number(boqItem.quantity) * Number(boqItem.unitPrice));
  }

  // Calculate actual cost by category
  for (const report of siteReports) {
    for (const item of report.logItems || []) {
      const cost = Number(item.quantity) * Number(item.unitPrice);
      totalSiteLogCost += cost;

      const cat = item.boqItem?.category || 'uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { budget: 0, actual: 0, variance: 0 };
      }
      byCategory[cat].actual += cost;
    }
  }

  // Round and calculate variance per category
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].budget = Math.round(byCategory[cat].budget * 100) / 100;
    byCategory[cat].actual = Math.round(byCategory[cat].actual * 100) / 100;
    byCategory[cat].variance = Math.round((byCategory[cat].budget - byCategory[cat].actual) * 100) / 100;
  }

  const overallVariance = totalBudget - totalSiteLogCost;
  const overallVariancePercent = totalBudget !== 0
    ? (overallVariance / totalBudget) * 100
    : 0;

  return {
    projectId,
    totalBudget: Math.round(totalBudget * 100) / 100,
    totalSiteLogCost: Math.round(totalSiteLogCost * 100) / 100,
    overallVariance: Math.round(overallVariance * 100) / 100,
    overallVariancePercent: Math.round(overallVariancePercent * 100) / 100,
    reportCount: siteReports.length,
    byCategory,
  };
}

const siteLogCostService = {
  calculateSiteLogCost,
  getBOQVariance,
  updateBOQFromSiteLog,
  getProjectCostSummary,
};

export default siteLogCostService;
