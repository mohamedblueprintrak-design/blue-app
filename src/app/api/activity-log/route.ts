import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { cachedQuery, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';

// Zod schema for activity log creation (simulate mode)
const activityLogCreateSchema = z.object({
  simulate: z.boolean().optional().default(false),
  action: z.string().max(100).optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    // RBAC CHECK - requires REPORTS_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const actionType = searchParams.get('actionType') || '';
    const entityType = searchParams.get('entityType') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const projectId = searchParams.get('projectId');
    const { page, limit, search } = parsePaginationParams(searchParams);

    // ActivityLog doesn't have organizationId; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { ...orgWhere };

    if (actionType) {
      where.action = actionType;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (dateFrom) {
      where.createdAt = { gte: new Date(dateFrom) };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.OR = [
        { details: { contains: search } },
        { action: { contains: search } },
        { entityType: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const cacheKey = buildCacheKey('activity-log', 'list', ctx.organizationId || 'global', actionType, entityType, dateFrom, `p${page}`, `l${limit}`, search || '', projectId || '');

    const { activities, total } = await cachedQuery(cacheKey, async () => {
      const [activities, total] = await Promise.all([
        db.activityLog.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.activityLog.count({ where }),
      ]);
      return { activities, total };
    }, CACHE_TTL.ACTIVITY_LOG);

    return NextResponse.json({ data: activities, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error: unknown) {
    return handleApiError(error, 'ActivityLog GET');
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - requires REPORTS_READ permission
    const rbac = await requireVerifiedPermission(request, Permission.REPORTS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const rawBody = await request.json();

    // Zod validation for activity log fields
    const validation = activityLogCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { simulate } = validation.data;

    if (!simulate) {
      return NextResponse.json({ error: 'Only simulate mode is supported' }, { status: 400 });
    }

    // Get a random user from the database (scoped to org if authenticated)
    const orgWhere = ctx?.organizationId ? { organizationId: ctx.organizationId } : {};
    const users = await db.user.findMany({
      where: orgWhere,
      select: { id: true, name: true, email: true, avatar: true, role: true },
      take: 10,
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    const randomUser = users[Math.floor(Math.random() * users.length)];

    const actions = ['create', 'update', 'delete', 'status_change', 'comment', 'upload'];
    const entities = ['project', 'task', 'contract', 'invoice', 'document', 'meeting', 'client'];

    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomEntity = entities[Math.floor(Math.random() * entities.length)];

    // Bilingual mock details
    const detailTemplates: Record<string, Record<string, string[]>> = {
      create: {
        project: ['إنشاء مشروع جديد: فيلا الخليج السكنية', 'مشروع برج الأفق الجديد', 'New project: Marina Heights Tower'],
        task: ['إضافة مهمة: مراجعة المخططات الإنشائية', 'مهمة جديدة: إعداد تقرير الكميات', 'New task: Review structural drawings'],
        contract: ['عقد خدمات هندسية جديد', 'عقد جديد مع شركة الوسيط', 'New engineering services contract'],
        invoice: ['فاتورة جديدة رقم INV-2025-0052', 'فاتورة بقيمة 32,000 د.إ', 'New invoice INV-2025-0052'],
        document: ['رفع مخططات التصميم المعماري', 'رفع تقرير الحسابات الإنشائية', 'Uploaded architectural design drawings'],
        MEETING: ['اجتماع جديد: مراجعة التصاميم', 'اجتماع لجنة المراجعة الأسبوعي', 'New meeting: Design review session'],
        client: ['إضافة عميل جديد: مجموعة السارية', 'تسجيل عميل جديد', 'New client registered: Al-Sarya Group'],
      },
      UPDATE: {
        project: ['تحديث تفاصيل مشروع فيلا النخيل', 'تعديل ميزانية المشروع', 'Updated project details for Palm Villa'],
        task: ['تحديث حالة المهمة إلى "قيد التنفيذ"', 'تعديل أولوية المهمة إلى عاجلة', 'Task status updated to In Progress'],
        contract: ['تحديث بنود العقد', 'تعديل قيمة العقد', 'Updated contract terms and conditions'],
        invoice: ['تحديث حالة الفاتورة إلى "مدفوعة"', 'تعديل مبلغ الفاتورة', 'Invoice status updated to Paid'],
        document: ['تحديث إصدار المستند', 'تعديل تصنيف المستند', 'Document version updated to v3'],
        MEETING: ['تحديث موعد الاجتماع', 'تعديل قائمة الحضور', 'Meeting rescheduled to next week'],
        client: ['تحديث بيانات العميل', 'تعديل حد الائتمان', 'Client information updated'],
      },
      DELETE: {
        project: ['حذف مشروع: فيلا الواحة القديمة', 'إزالة مشروع مكتمل', 'Removed project: Old Oasis Villa'],
        task: ['حذف مهمة مكررة', 'إزالة مهمة ملغاة', 'Removed duplicate task'],
        contract: ['حذف عقد منتهي الصلاحية', 'إزالة عقد ملغي', 'Removed expired contract'],
        invoice: ['حذف فاتورة مسودة', 'إزالة فاتورة مكررة', 'Removed draft invoice'],
        document: ['حذف مستند قديم', 'إزالة مرفق غير مطلوب', 'Removed old document version'],
        MEETING: ['حذف اجتماع ملغي', 'إزالة اجتماع مكرر', 'Cancelled meeting removed'],
        client: ['حذف عميل غير نشط', 'إزالة بيانات عميل اختباري', 'Removed inactive client record'],
      },
      status_change: {
        project: ['تغيير حالة المشروع إلى "مكتمل"', 'تحديث تقدم المشروع إلى 90%', 'Project status changed to Completed'],
        task: ['تغيير حالة المهمة إلى "منتهية"', 'تحديث أولوية المهمة', 'Task priority changed to Urgent'],
        contract: ['تغيير حالة العقد إلى "نشط"', 'تحديث حالة العقد إلى "منتهي"', 'Contract status changed to Active'],
        invoice: ['تغيير حالة الفاتورة إلى "متأخرة"', 'تحديث حالة الدفع', 'Invoice marked as Overdue'],
        document: ['تغيير حالة المستند إلى "معتمد"', 'تحديث حالة المراجعة', 'Document status changed to Approved'],
        MEETING: ['تغيير حالة الاجتماع إلى "مكتمل"', 'تحديث حالة الحضور', 'Meeting status changed to Completed'],
        client: ['تغيير حالة العميل إلى "نشط"', 'تحديث تصنيف العميل', 'Client status updated to Active'],
      },
      comment: {
        project: ['تعليق على المشروع: "يحتاج مراجعة إضافية"', 'ملاحظة على التقدم', 'Comment: Needs additional review'],
        task: ['تعليق على المهمة: "تم إنجاز المرحلة الأولى"', 'ملاحظة على الحسابات', 'Comment: Phase 1 completed successfully'],
        contract: ['تعليق على العقد: "بانتظار التوقيع"', 'ملاحظة على البودgetic', 'Comment: Pending signature from client'],
        invoice: ['تعليق على الفاتورة: "تم التحقق من المبلغ"', 'ملاحظة على الدفع', 'Comment: Amount verified and confirmed'],
        document: ['تعليق على المستند: "يحتاج تحديث"', 'ملاحظة على الإصدار', 'Comment: Document needs revision'],
        MEETING: ['تعليق على الاجتماع: "تم اتخاذ القرارات"', 'ملاحظات المحضر', 'Comment: Meeting minutes finalized'],
        client: ['تعليق على العميل: "عميل مميز"', 'ملاحظة على التواصل', 'Comment: VIP client - priority handling'],
      },
      upload: {
        project: ['رفع مخططات المشروع المحدثة', 'رفع تقرير التقدم الشهري', 'Uploaded updated project blueprints'],
        task: ['رفع مرفقات المهمة', 'رفع صور التنفيذ', 'Uploaded task attachments'],
        contract: ['رفع نسخة العقد الموقعة', 'رفع ملحق العقد', 'Uploaded signed contract copy'],
        invoice: ['رفع إيصال الدفع', 'رفع مستند الضريبة', 'Uploaded payment receipt'],
        document: ['رفع مستند جديد', 'رفع نسخة محدثة', 'Uploaded new document version'],
        MEETING: ['رفع محضر الاجتماع', 'رفع عرض التقديم', 'Uploaded meeting minutes'],
        client: ['رفع وثائق العميل', 'رفع العقد الإطاري', 'Uploaded client documentation'],
      },
    };

    const entityTemplates = detailTemplates[randomAction]?.[randomEntity];
    const randomDetail = entityTemplates
      ? entityTemplates[Math.floor(Math.random() * entityTemplates.length)]
      : `${randomAction} ${randomEntity} activity`;

    const activity = await db.activityLog.create({
      data: {
        userId: randomUser.id,
        action: randomAction,
        entityType: randomEntity,
        entityId: `sim-${Date.now()}`,
        details: randomDetail,
        metadata: JSON.stringify({ simulated: true, timestamp: new Date().toISOString() }),
        organizationId: ctx?.organizationId || 'org-blueprint-rak',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    });

    return NextResponse.json(activity);
  } catch (error: unknown) {
    return handleApiError(error, 'ActivityLog POST');
  }
}
