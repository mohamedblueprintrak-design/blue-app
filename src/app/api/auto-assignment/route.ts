/**
 * Auto-Assignment Rules API Route
 * مسار قواعد التعيين التلقائي
 *
 * GET  /api/auto-assignment          — List rules for the organization
 * POST /api/auto-assignment          — Create a new rule
 * POST /api/auto-assignment/test     — Test a rule against sample data
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest } from '@/lib/api-validation';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { testAutoAssignmentRule, createRule, getRules } from '@/lib/services/auto-assignment.service';
import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

const conditionSchema = z.object({
  field: z.string().min(1, 'حقل الشرط مطلوب'),
  operator: z.enum(['equals', 'not_equals', 'contains', 'in', 'starts_with'] as const, {
    message: 'عامل الشرط غير صالح',
  }),
  value: z.union([z.string(), z.array(z.string())]),
});

const actionSchema = z.object({
  assignToId: z.string().optional(),
  notify: z.boolean().optional().default(true),
  setPriority: z.string().optional(),
  addTags: z.array(z.string()).optional(),
}).optional().default(() => ({ notify: true }));

const autoAssignmentCreateSchema = z.object({
  name: z.string().min(1, 'اسم القاعدة مطلوب').max(200, 'الاسم طويل جداً'),
  nameEn: z.string().max(200).optional().default(''),
  nameAr: z.string().max(200).optional().default(''),
  description: z.string().max(2000).optional().default(''),
  triggerType: z.enum(['task_created', 'task_status_changed', 'project_created', 'document_uploaded'] as const, {
    message: 'نوع المشغل غير صالح',
  }),
  conditions: z.array(conditionSchema).min(0).default([]),
  action: actionSchema,
  assignToType: z.enum(['user', 'role', 'round_robin'] as const, {
    message: 'نوع التعيين غير صالح',
  }),
  assignToId: z.string().min(1, 'معرف التعيين مطلوب'),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().min(0).optional().default(0),
});

const testRuleSchema = z.object({
  ruleId: z.string().min(1, 'معرف القاعدة مطلوب'),
  sampleData: z.record(z.string(), z.unknown()),
});

// ============================================
// Helpers
// ============================================

function successResponse(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ============================================
// GET — List auto-assignment rules
// ============================================

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rules = await getRules(ctx.organizationId);

    // Parse conditions and action JSON for each rule
    const rulesWithParsedFields = (rules as Record<string, unknown>[]).map((rule) => ({
      ...rule,
      conditions: JSON.parse(String(rule.conditions || '[]')),
      action: JSON.parse(String(rule.action || '{}')),
    }));

    return successResponse(rulesWithParsedFields);
  } catch (error) {
    log.error('Error fetching auto-assignment rules:', error);
    return errorResponse('فشل في جلب قواعد التعيين التلقائي', 500);
  }
}

// ============================================
// POST — Create a new rule OR test a rule
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    // Check if this is a test request
    if (body.ruleId && body.sampleData) {
      return handleTestRule(body, ctx);
    }

    // Otherwise, create a new rule
    return handleCreateRule(body, ctx);
  } catch (error) {
    log.error('Error in auto-assignment POST:', error);
    return errorResponse('حدث خطأ في قواعد التعيين التلقائي', 500);
  }
}

// ============================================
// Handle: Create Rule
// ============================================

async function handleCreateRule(
  body: unknown,
  ctx: { userId: string; organizationId: string | null }
) {
  const validation = validateRequest(autoAssignmentCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error);
  }

  const data = validation.data;

  const created = await createRule({
    name: data.name,
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    description: data.description,
    triggerType: data.triggerType,
    conditions: data.conditions,
    action: data.action,
    assignToType: data.assignToType,
    assignToId: data.assignToId,
    isActive: data.isActive,
    priority: data.priority,
    createdById: ctx.userId,
    organizationId: ctx.organizationId,
  });

  return successResponse({
    ...(created as Record<string, unknown>),
    conditions: JSON.parse(String((created as Record<string, unknown>).conditions || '[]')),
    action: JSON.parse(String((created as Record<string, unknown>).action || '{}')),
  });
}

// ============================================
// Handle: Test Rule
// ============================================

async function handleTestRule(
  body: unknown,
  ctx: { userId: string; organizationId: string | null }
) {
  const validation = validateRequest(testRuleSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error);
  }

  const { ruleId, sampleData } = validation.data;

  const testResult = await testAutoAssignmentRule(ruleId, sampleData, ctx.organizationId);

  log.info(`[AutoAssignment] Rule tested: ${ruleId} by ${ctx.userId}, matched=${testResult.matched}`);

  return successResponse(testResult);
}
