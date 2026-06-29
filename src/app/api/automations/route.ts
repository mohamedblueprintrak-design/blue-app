import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter, orgCreate } from '../utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, automationCreateSchema } from '@/lib/api-validation';

function successResponse(data: unknown) { return NextResponse.json({ success: true, data }); }
function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET - Fetch all automations
export async function GET(request: NextRequest) {
  const result = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
  if ('error' in result) return result.error;
  const ctx = result.user;

  try {
    // Query database for automations — filtered by org for multi-tenant isolation
    const dbAutomations = await db.automation.findMany({
      where: orgFilter(ctx),
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(dbAutomations);
  } catch (error) {
    log.error('Error fetching automations:', error);
    return errorResponse('Failed to fetch automations', 500);
  }
}

// POST - Create new automation
export async function POST(request: NextRequest) {
  const result = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ('error' in result) return result.error;
  const ctx = result.user;

  try {
    const rawBody = await request.json();

    // Zod validation for automation create fields
    const validation = validateRequest(automationCreateSchema, rawBody);
    if (!validation.success) {
      return errorResponse(validation.error);
    }
    const validatedData = validation.data;
    const { name, description, triggerType, triggerConfig, actionType, actionConfig } = validatedData;

    const created = await db.automation.create({
      data: {
        name,
        description: description || '',
        triggerType: triggerType,
        triggerConfig: typeof triggerConfig === 'string' ? triggerConfig : JSON.stringify(triggerConfig ?? {}),
        actionType: actionType,
        actionConfig: typeof actionConfig === 'string' ? actionConfig : JSON.stringify(actionConfig ?? {}),
        status: 'INACTIVE',
        ...orgCreate(ctx),
      },
    });
    return successResponse(created);
  } catch (error) {
    log.error('Error creating automation:', error);
    return errorResponse('Failed to create automation', 500);
  }
}
