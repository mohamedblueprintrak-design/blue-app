import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedAuth, orgFilter } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString, escapeSqlLike } from '@/lib/security/sanitize';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { getCompanyCurrency } from '@/lib/currency';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  data?: Record<string, unknown>;
}

interface GroupedResults {
  project: SearchResult[];
  task: SearchResult[];
  client: SearchResult[];
  invoice: SearchResult[];
  document: SearchResult[];
}

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // SECURITY: Use requireVerifiedAuth to prevent header forgery
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // RBAC: Verify search permission as a gate — individual entity permissions
    // are still checked below to determine which entity types to include.
    // SEARCH_READ is required for all users — this is not a self-data route.
    if (!hasPermission(ctx.role, Permission.SEARCH_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = sanitizeString(searchParams.get('q') || '');
    const projectId = searchParams.get('projectId');

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: {}, total: 0 });
    }

    // Escape % and _ wildcards that could manipulate search behavior
    // Prisma `contains` is LIKE-based, so these wildcards are meaningful
    const query = escapeSqlLike(q.trim().toLowerCase());

    // Build org filters
    const orgWhere = orgFilter(ctx);
    const projectOrgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};

    // Build project-specific where clause
    const projectFilter: Record<string, unknown> = projectId ? { projectId } : {};
    const grouped: GroupedResults = {
      project: [],
      task: [],
      client: [],
      invoice: [],
      document: [],
    };

    // RBAC: Determine which entity types the user is allowed to search
    const canSearchProjects = hasPermission(ctx.role, Permission.PROJECT_READ);
    const canSearchTasks = hasPermission(ctx.role, Permission.TASK_READ);
    const canSearchClients = hasPermission(ctx.role, Permission.CLIENT_READ);
    const canSearchInvoices = hasPermission(ctx.role, Permission.INVOICE_READ);
    const canSearchDocuments = hasPermission(ctx.role, Permission.DOCUMENT_READ);

    // ===== Search Projects (by name, nameEn, number, location) =====
    const projectWhere: Record<string, unknown> = {
      OR: [
        { name: { contains: query } },
        { nameEn: { contains: query } },
        { number: { contains: query } },
        { location: { contains: query } },
      ],
      deletedAt: null,
      ...orgWhere,
    };
    if (projectId) projectWhere.id = projectId;

    // Run search queries in parallel — only for entity types the user has permission to read
    const [projects, tasks, clients, invoices, documents] = await Promise.all([
      canSearchProjects
        ? db.project.findMany({ where: projectWhere, take: 10, select: { id: true, name: true, nameEn: true, number: true, status: true, location: true, clientId: true } })
        : [],
      canSearchTasks
        ? db.task.findMany({ where: { ...projectFilter, ...projectOrgWhere, deletedAt: null, OR: [{ title: { contains: query } }, { description: { contains: query } }] }, take: 10, select: { id: true, title: true, status: true, priority: true, projectId: true } })
        : [],
      canSearchClients
        ? db.client.findMany({ where: { ...orgWhere, deletedAt: null, OR: [{ name: { contains: query } }, { company: { contains: query } }, { email: { contains: query } }, { phone: { contains: query } }] }, take: 10, select: { id: true, name: true, company: true, email: true, phone: true } })
        : [],
      canSearchInvoices
        ? db.invoice.findMany({ where: { ...projectFilter, ...projectOrgWhere, deletedAt: null, OR: [{ number: { contains: query } }] }, take: 10, select: { id: true, number: true, total: true, status: true, clientId: true } })
        : [],
      canSearchDocuments
        ? db.document.findMany({ where: { ...projectFilter, ...projectOrgWhere, deletedAt: null, OR: [{ name: { contains: query } }, { category: { contains: query } }] }, take: 10, select: { id: true, name: true, fileType: true, category: true, projectId: true } })
        : [],
    ]);


    for (const p of projects) {
      grouped.project.push({
        type: 'project',
        id: p.id,
        title: p.name || p.nameEn || p.number,
        subtitle: `${p.number} · ${p.location || '—'}`,
        status: p.status,
        data: { projectId: p.id },
      });
    }

    for (const task of tasks) {
      grouped.task.push({
        type: 'task',
        id: task.id,
        title: task.title || '—',
        subtitle: `${task.priority} · ${task.projectId ? 'مشروع' : '—'}`,
        status: task.status,
        data: { projectId: task.projectId },
      });
    }

    for (const c of clients) {
      grouped.client.push({
        type: 'client',
        id: c.id,
        title: c.name || c.company || '',
        subtitle: c.company || c.email || c.phone || '',
        status: 'ACTIVE',
      });
    }

    const companyCurrency = await getCompanyCurrency(ctx.organizationId);
    for (const inv of invoices) {
      grouped.invoice.push({
        type: 'invoice',
        id: inv.id,
        title: inv.number || '—',
        subtitle: `${inv.total.toLocaleString()} ${companyCurrency}`,
        status: inv.status,
      });
    }

    for (const doc of documents) {
      grouped.document.push({
        type: 'document',
        id: doc.id,
        title: doc.name || '—',
        subtitle: `${doc.fileType || 'file'} · ${doc.category}`,
        status: 'AVAILABLE',
        data: { projectId: doc.projectId },
      });
    }

    // Compute total
    const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

    return NextResponse.json({ results: grouped, total });
  } catch (error: unknown) {
    log.error('Search API error:', error);
    return handleApiError(error, 'Search');
  }
}
