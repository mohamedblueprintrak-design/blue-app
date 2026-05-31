import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { cacheGetOrSet } from '@/lib/cache/redis';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('statsOnly') === 'true';

    // Build org filter for direct queries on models with organizationId
    const orgWhere = orgFilter(ctx);
    // Build org filter for models that filter through project relationship
    const projectOrgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};

    // Build cache key based on user's org and query params
    const cacheKey = `dashboard:${ctx.organizationId || 'global'}:${statsOnly ? 'stats' : 'full'}`;

    const result = await cacheGetOrSet(
      cacheKey,
      async () => {
        // ===== Batch 1: All count queries (parallel) =====
        const [totalProjects, activeProjects, completedProjects, delayedProjects, overdueTasksCount, usersCount] =
          await Promise.all([
            db.project.count({ where: orgWhere }),
            db.project.count({ where: { status: 'ACTIVE', ...orgWhere } }),
            db.project.count({ where: { status: 'COMPLETED', ...orgWhere } }),
            db.project.count({ where: { status: 'DELAYED', ...orgWhere } }),
            db.task.count({
              where: {
                status: { notIn: ['DONE', 'CANCELLED'] },
                dueDate: { not: null, lt: new Date(new Date().setHours(0, 0, 0, 0)) },
                ...projectOrgWhere,
              },
            }),
            db.user.count({ where: orgWhere }),
          ]);

        // If only stats are requested, return early
        if (statsOnly) {
          return {
            _statsOnly: true,
            stats: {
              totalProjects,
              activeProjects,
              completedProjects,
              delayedProjects,
            },
            overdueTasksCount,
            usersCount,
          };
        }

        // ===== Batch 2: All data queries (parallel) =====
        const [allOutstanding, paidInvoices, recentProjects, upcomingTasks, pendingGovApprovals] =
          await Promise.all([
            // Outstanding invoices (with limit to prevent loading all records)
            db.invoice.findMany({
              where: {
                status: { in: ['OVERDUE', 'SENT', 'PARTIALLY_PAID'] },
                ...projectOrgWhere,
              },
              select: { total: true, remaining: true, status: true, dueDate: true, number: true, projectId: true, client: { select: { name: true, company: true } } },
              take: 200, // Limit to prevent loading all records
            }),
            // Paid invoices for revenue calculation
            db.invoice.findMany({
              where: {
                status: { in: ['PAID', 'PARTIALLY_PAID'] },
                paidAmount: { gt: 0 },
                issueDate: { gte: (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })() },
                ...projectOrgWhere,
              },
              select: { paidAmount: true, issueDate: true },
            }),
            // Recent projects
            db.project.findMany({
              where: orgWhere,
              orderBy: { updatedAt: 'desc' },
              take: 5,
              include: {
                client: { select: { name: true, company: true } },
              },
            }),
            // Upcoming tasks
            db.task.findMany({
              where: {
                status: { notIn: ['DONE', 'CANCELLED'] },
                dueDate: { not: null, lte: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })() },
                ...projectOrgWhere,
              },
              orderBy: { dueDate: 'asc' },
              take: 10,
              include: {
                project: { select: { number: true, name: true } },
                assignee: { select: { name: true } },
              },
            }),
            // Pending government approvals
            db.govApproval.findMany({
              where: { status: { in: ['PENDING', 'SUBMITTED'] }, project: orgWhere },
              include: {
                project: { select: { number: true, name: true } },
              },
              take: 5,
            }),
          ]);

        // ===== Batch 3: Stages query (potentially huge — add limit) =====
        const allStages = await db.projectStage.findMany({
          where: {
            project: { status: 'ACTIVE', ...orgWhere },
          },
          select: {
            department: true,
            status: true,
          },
          take: 500, // Limit to prevent loading unbounded datasets
        });

        // ===== Compute derived data =====

        // Invoice stats
        const overdueInvoices = allOutstanding.filter(i => i.status === 'OVERDUE');
        const outstandingTotal = allOutstanding.reduce((sum, i) => sum + Number(i.remaining), 0);
        const outstandingCount = allOutstanding.length;
        const overdueCount = overdueInvoices.length;

        // Monthly revenue
        const revenueByMonth: Record<string, number> = {};
        for (const inv of paidInvoices) {
          const key = `${inv.issueDate.getFullYear()}-${String(inv.issueDate.getMonth() + 1).padStart(2, '0')}`;
          revenueByMonth[key] = (revenueByMonth[key] || 0) + Number(inv.paidAmount);
        }

        const monthlyRevenue: Array<{ month: string; labelAr: string; labelEn: string; revenue: number }> = [];
        const now = new Date();
        const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthIdx = d.getMonth();
          monthlyRevenue.push({
            month: key,
            labelAr: monthNamesAr[monthIdx],
            labelEn: monthNamesEn[monthIdx],
            revenue: Math.round(revenueByMonth[key] || 0),
          });
        }

        const thisMonth = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
        const lastMonth = monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0;
        const revenueChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

        // Overdue tasks
        const overdueTasks = upcomingTasks.filter(
          t => t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
        );

        // Department progress
        const deptGroups: Record<string, { total: number; completed: number }> = {
          ARCHITECTURAL: { total: 0, completed: 0 },
          STRUCTURAL: { total: 0, completed: 0 },
          MEP: { total: 0, completed: 0 },
        };

        for (const stage of allStages) {
          let group: string = stage.department;
          if (stage.department.startsWith('MEP_')) {
            group = 'MEP';
          }
          if (deptGroups[group]) {
            deptGroups[group].total++;
            if (stage.status === 'APPROVED' || (stage as Record<string, unknown>).status === 'COMPLETED') {
              deptGroups[group].completed++;
            }
          }
        }

        const departmentProgress = [
          {
            key: 'architectural',
            labelAr: 'القسم المعماري',
            labelEn: 'Architectural',
            ...deptGroups.ARCHITECTURAL,
            progress: deptGroups.ARCHITECTURAL.total > 0
              ? Math.round((deptGroups.ARCHITECTURAL.completed / deptGroups.ARCHITECTURAL.total) * 100)
              : 0,
            color: 'bg-teal-500',
          },
          {
            key: 'structural',
            labelAr: 'القسم الإنشائي',
            labelEn: 'Structural',
            ...deptGroups.STRUCTURAL,
            progress: deptGroups.STRUCTURAL.total > 0
              ? Math.round((deptGroups.STRUCTURAL.completed / deptGroups.STRUCTURAL.total) * 100)
              : 0,
            color: 'bg-blue-500',
          },
          {
            key: 'mep',
            labelAr: 'الأقسام الكهروميكانيكية',
            labelEn: 'MEP',
            ...deptGroups.MEP,
            progress: deptGroups.MEP.total > 0
              ? Math.round((deptGroups.MEP.completed / deptGroups.MEP.total) * 100)
              : 0,
            color: 'bg-amber-500',
          },
        ];

        // ===== Alerts =====
        const alerts: Array<{
          id: string;
          type: 'overdue_invoice' | 'pending_approval' | 'overdue_task';
          titleAr: string;
          titleEn: string;
          descriptionAr: string;
          descriptionEn: string;
          timestamp: string;
          severity: 'high' | 'medium' | 'low';
        }> = [];

        for (const inv of overdueInvoices) {
          alerts.push({
            id: `inv-${inv.number}`,
            type: 'overdue_invoice',
            titleAr: `فاتورة متأخرة: ${inv.number}`,
            titleEn: `Overdue Invoice: ${inv.number}`,
            descriptionAr: `فاتورة بمبلغ ${inv.remaining.toLocaleString()} AED مستحقة للسداد - ${inv.client?.company || inv.client?.name || ''}`,
            descriptionEn: `Invoice of ${inv.remaining.toLocaleString()} AED is overdue - ${inv.client?.company || inv.client?.name || ''}`,
            timestamp: inv.dueDate?.toISOString() || new Date().toISOString(),
            severity: 'high',
          });
        }

        for (const approval of pendingGovApprovals) {
          alerts.push({
            id: `gov-${approval.id}`,
            type: 'pending_approval',
            titleAr: `موافقة حكومية معلقة: ${approval.authority}`,
            titleEn: `Pending Gov. Approval: ${approval.authority}`,
            descriptionAr: `موافقة ${approval.authority} للمشروع ${approval.project.number} بحاجة متابعة`,
            descriptionEn: `${approval.authority} approval for project ${approval.project.number} needs follow-up`,
            timestamp: approval.submissionDate?.toISOString() || new Date().toISOString(),
            severity: 'medium',
          });
        }

        for (const task of overdueTasks) {
          alerts.push({
            id: `task-${task.id}`,
            type: 'overdue_task',
            titleAr: `مهمة متأخرة: ${task.title}`,
            titleEn: `Overdue Task: ${task.title}`,
            descriptionAr: `المهمة تجاوزت الموعد النهائي - ${task.project?.name || ''}`,
            descriptionEn: `Task has exceeded its deadline - ${task.project?.name || ''}`,
            timestamp: task.dueDate?.toISOString() || new Date().toISOString(),
            severity: 'high',
          });
        }

        alerts.sort((a, b) => {
          const severityOrder = { high: 0, medium: 1, low: 2 };
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity];
          }
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        return {
          _statsOnly: false,
          stats: {
            totalProjects,
            activeProjects,
            completedProjects,
            delayedProjects,
          },
          invoices: {
            outstandingTotal: Math.round(outstandingTotal),
            outstandingCount,
            overdueCount,
          },
          revenue: {
            monthly: monthlyRevenue,
            thisMonth: Math.round(thisMonth),
            lastMonth: Math.round(lastMonth),
            change: revenueChange,
          },
          recentProjects: recentProjects.map(p => ({
            id: p.id,
            number: p.number,
            name: p.name,
            nameEn: p.nameEn,
            clientName: p.client?.name || '',
            clientCompany: p.client?.company || '',
            status: p.status,
            progress: p.progress,
            updatedAt: p.updatedAt.toISOString(),
          })),
          upcomingTasks: upcomingTasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString() || null,
            isOverdue: t.dueDate ? new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false,
            projectName: t.project?.name || '',
            projectNumber: t.project?.number || '',
            assigneeName: t.assignee?.name || '',
          })),
          activeTasksCount: upcomingTasks.length,
          overdueTasksCount: overdueTasks.length,
          overdueTasksSidebarCount: overdueTasksCount,
          departmentProgress,
          alerts: alerts.slice(0, 10),
        };
      },
      60 // Cache dashboard data for 60 seconds
    );

    if (result._statsOnly && statsOnly) {
      const { _statsOnly: _flag1, ...statsResponse } = result;
      return NextResponse.json(statsResponse);
    }

    // Remove internal flag from response
    const { _statsOnly: _flag2, ...response } = result;
    return NextResponse.json(response);
  } catch (error) {
    log.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
