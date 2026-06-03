/**
 * Auto-Assignment Rule Individual CRUD
 * عمليات قاعدة التعيين التلقائي الفردية
 *
 * GET    /api/auto-assignment/[id] — Get a single rule
 * PUT    /api/auto-assignment/[id] — Update a rule
 * DELETE /api/auto-assignment/[id] — Soft-delete a rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam } from '@/lib/api-validation';
import { updateRule, deleteRule } from '@/lib/services/auto-assignment.service';

// ============================================
// Zod Schema for Update
// ============================================

import { z } from 'zod';

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'in', 'starts_with']),
  value: z.union([z.string(), z.array(z.string())]),
});

const actionSchema = z.object({
  assignToId: z.string().optional(),
  notify: z.boolean().optional(),
  setPriority: z.string().optional(),
  addTags: z.array(z.string()).optional(),
}).optional();

const autoAssignmentUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  triggerType: z.enum(['task_created', 'task_status_changed', 'project_created', 'document_uploaded']).optional(),
  conditions: z.array(conditionSchema).optional(),
  action: actionSchema,
  assignToType: z.enum(['user', 'role', 'round_robin']).optional(),
  assignToId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
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
// GET — Get a single rule
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const rule = await db.autoAssignmentRule.findFirst({
      where: {
        id,
        deletedAt: null,
        ...orgFilter(ctx) as Record<string, unknown>,
      },
    });

    if (!rule) {
      return errorResponse('القاعدة غير موجودة', 404);
    }

    return successResponse({
      ...rule,
      conditions: JSON.parse(rule.conditions || '[]'),
      action: JSON.parse(rule.action || '{}'),
    });
  } catch (error) {
    log.error('Error fetching auto-assignment rule:', error);
    return errorResponse('فشل في جلب قاعدة التعيين التلقائي', 500);
  }
}

// ============================================
// PUT — Update a rule
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify the rule belongs to the user's organization and is not soft-deleted
    const existing = await db.autoAssignmentRule.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) as Record<string, unknown> },
    });

    if (!existing) {
      return errorResponse('القاعدة غير موجودة', 404);
    }

    const body = await request.json();
    const validation = validateRequest(autoAssignmentUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    const updated = await updateRule(id, {
      name: updateData.name,
      nameEn: updateData.nameEn,
      nameAr: updateData.nameAr,
      description: updateData.description,
      triggerType: updateData.triggerType,
      conditions: updateData.conditions,
      action: updateData.action,
      assignToType: updateData.assignToType,
      assignToId: updateData.assignToId,
      isActive: updateData.isActive,
      priority: updateData.priority,
    });

    log.info(`[AutoAssignment] Rule updated: ${id} by ${ctx.userId}`);

    return successResponse({
      ...(updated as Record<string, unknown>),
      conditions: JSON.parse(String((updated as Record<string, unknown>).conditions || '[]')),
      action: JSON.parse(String((updated as Record<string, unknown>).action || '{}')),
    });
  } catch (error) {
    log.error('Error updating auto-assignment rule:', error);
    return errorResponse('فشل في تحديث قاعدة التعيين التلقائي', 500);
  }
}

// ============================================
// DELETE — Soft-delete a rule
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify the rule belongs to the user's organization and is not already deleted
    const existing = await db.autoAssignmentRule.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) as Record<string, unknown> },
    });

    if (!existing) {
      return errorResponse('القاعدة غير موجودة', 404);
    }

    await deleteRule(id);

    log.info(`[AutoAssignment] Rule deleted: ${id} by ${ctx.userId}`);

    return successResponse({ id, deleted: true });
  } catch (error) {
    log.error('Error deleting auto-assignment rule:', error);
    return errorResponse('فشل في حذف قاعدة التعيين التلقائي', 500);
  }
}
