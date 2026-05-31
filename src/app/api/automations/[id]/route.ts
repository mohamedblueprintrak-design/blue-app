import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, automationUpdateSchema } from '@/lib/api-validation';

function successResponse(data: unknown) { return NextResponse.json({ success: true, data }); }
function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// PATCH - Update automation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ('error' in result) return result.error;
  const ctx = result.user;

  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(automationUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { status } = body;

    if (!status || !['ACTIVE', 'INACTIVE', 'PAUSED'].includes(status)) {
      return errorResponse('Invalid status value');
    }

    // SECURITY: Verify the automation belongs to the user's organization
    const existing = await db.automation.findFirst({ where: { id, deletedAt: null, ...orgFilter(ctx) } });
    if (!existing) {
      return errorResponse('Automation not found', 404);
    }

    const updated = await db.automation.update({
      where: { id },
      data: { status },
    });
    return successResponse(updated);
  } catch (error) {
    log.error('Error updating automation:', error);
    return errorResponse('Failed to update automation', 500);
  }
}

// DELETE - Delete automation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ('error' in result) return result.error;
  const ctx = result.user;

  try {
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // SECURITY: Verify the automation belongs to the user's organization
    const existing = await db.automation.findFirst({ where: { id, deletedAt: null, ...orgFilter(ctx) } });
    if (!existing) {
      return errorResponse('Automation not found', 404);
    }

    await db.automation.update({ where: { id }, data: { deletedAt: new Date() } });
    return successResponse({ id, deleted: true });
  } catch (error) {
    log.error('Error deleting automation:', error);
    return errorResponse('Failed to delete automation', 500);
  }
}
