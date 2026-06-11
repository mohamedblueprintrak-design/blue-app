import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createWorkflowTemplate } from '@/lib/workflow-engine'
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { Permission } from '@/lib/auth/types';
import { z } from 'zod';

// Zod schema for workflow template creation
const createWorkflowTemplateSchema = z.object({
  name: z.string().min(1, 'اسم القالب مطلوب').max(200, 'اسم القالب طويل جداً'),
  nameEn: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  stages: z.array(z.object({
    name: z.string().min(1, 'اسم المرحلة مطلوب').max(200),
    nameEn: z.string().max(200).optional(),
    order: z.number().int().min(0),
    durationDays: z.number().int().min(0).optional(),
    isParallel: z.boolean().optional(),
    isOptional: z.boolean().optional(),
    steps: z.array(z.object({
      name: z.string().min(1, 'اسم الخطوة مطلوب').max(200),
      nameEn: z.string().max(200).optional(),
      order: z.number().int().min(0),
      assignedRole: z.string().max(100).optional(),
      isRequired: z.boolean().optional(),
      requiresApproval: z.boolean().optional(),
      autoComplete: z.boolean().optional(),
      onCompleteAction: z.string().max(100).optional(),
      daysToComplete: z.number().int().min(0).optional(),
    })).optional(),
  })).optional(),
}).strict(); // Reject unknown fields

// POST /api/workflows/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const _ctx = rbac.user;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'جسم الطلب غير صالح' },
        { status: 400 }
      );
    }

    const validation = createWorkflowTemplateSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const template = await createWorkflowTemplate(validation.data);
    return NextResponse.json(template, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplates POST');
  }
}

// GET /api/workflows/templates - List templates
export async function GET(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const templates = await db.workflowTemplate.findMany({
      where: { isActive: true, ...orgFilter(ctx) },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplates GET');
  }
}
