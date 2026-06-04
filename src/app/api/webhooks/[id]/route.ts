import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { errorResponse, notFoundResponse } from '@/app/api/utils/response';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { webhookService } from '@/lib/services/webhook.service';
import { z } from 'zod';

// Validation schema for updating a webhook
const updateWebhookSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['SLACK', 'TEAMS', 'CUSTOM']).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  secret: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Mask a URL for security — show only the domain
 */
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/**`;
  } catch {
    return '***';
  }
}

/**
 * GET /api/webhooks/[id]
 * Get a single webhook (RBAC: SETTINGS_READ)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const webhook = await db.webhookIntegration.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!webhook) {
      return notFoundResponse();
    }

    return NextResponse.json({ ...webhook, url: maskUrl(webhook.url) });
  } catch (error) {
    log.error('Error fetching webhook:', error);
    return errorResponse('Failed to fetch webhook', 'SERVER_ERROR', 500);
  }
}

/**
 * PUT /api/webhooks/[id]
 * Update a webhook (RBAC: SETTINGS_UPDATE)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const existing = await db.webhookIntegration.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existing) {
      return notFoundResponse();
    }

    const body = await request.json();
    const validation = updateWebhookSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0].message,
        'VALIDATION_ERROR',
        400,
      );
    }

    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.events !== undefined) updateData.events = JSON.stringify(data.events);
    if (data.secret !== undefined) updateData.secret = data.secret;
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      // Reset failure count when reactivating
      if (data.isActive && !existing.isActive) {
        updateData.failureCount = 0;
      }
    }

    const updated = await db.webhookIntegration.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    log.info('Webhook updated', { id, updatedBy: ctx.userId });

    return NextResponse.json({ ...updated, url: maskUrl(updated.url) });
  } catch (error) {
    log.error('Error updating webhook:', error);
    return errorResponse('Failed to update webhook', 'SERVER_ERROR', 500);
  }
}

/**
 * DELETE /api/webhooks/[id]
 * Delete a webhook (RBAC: SETTINGS_UPDATE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const existing = await db.webhookIntegration.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existing) {
      return notFoundResponse();
    }

    await db.webhookIntegration.delete({
      where: { id },
    });

    log.info('Webhook deleted', { id, deletedBy: ctx.userId });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    log.error('Error deleting webhook:', error);
    return errorResponse('Failed to delete webhook', 'SERVER_ERROR', 500);
  }
}

/**
 * POST /api/webhooks/[id]/test
 * Test a webhook by sending a test payload (RBAC: SETTINGS_UPDATE)
 */
export async function POST_test(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id } = await params;

    const result = await webhookService.testWebhook(id, ctx.organizationId || '');

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Test failed',
        status: result.status,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
      status: result.status,
    });
  } catch (error) {
    log.error('Error testing webhook:', error);
    return errorResponse('Failed to test webhook', 'SERVER_ERROR', 500);
  }
}
