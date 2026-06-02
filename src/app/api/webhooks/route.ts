import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, orgFilter } from '@/app/api/utils/auth';
import { errorResponse } from '@/app/api/utils/response';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// Available event types
const VALID_EVENTS = [
  'invoice.created',
  'invoice.paid',
  'task.assigned',
  'task.overdue',
  'approval.pending',
  'project.created',
  'document.uploaded',
] as const;

// Validation schema for creating a webhook
const createWebhookSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['SLACK', 'TEAMS', 'CUSTOM']),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().max(200).optional(),
});

/**
 * Validate webhook URL based on type
 */
function validateWebhookUrl(url: string, type: string): string | null {
  try {
    const parsed = new URL(url);

    switch (type) {
      case 'SLACK':
        if (!parsed.hostname.endsWith('hooks.slack.com')) {
          return 'Slack webhook URLs must start with https://hooks.slack.com/';
        }
        break;
      case 'TEAMS':
        if (!parsed.hostname.endsWith('outlook.office.com')) {
          return 'Teams webhook URLs must start with https://outlook.office.com/webhook/';
        }
        break;
      case 'CUSTOM':
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return 'Custom webhook URLs must use HTTP or HTTPS';
        }
        break;
    }

    return null;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * GET /api/webhooks
 * List all webhooks for the organization (RBAC: SETTINGS_READ)
 */
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const rbac = requirePermission(request, Permission.SETTINGS_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const webhooks = await db.webhookIntegration.findMany({
      where: {
        ...orgFilter(ctx),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask the URL for security — only show the domain
    const masked = webhooks.map((wh) => ({
      ...wh,
      url: maskUrl(wh.url),
    }));

    return NextResponse.json({ webhooks: masked });
  } catch (error) {
    log.error('Error fetching webhooks:', error);
    return errorResponse('Failed to fetch webhooks', 'SERVER_ERROR', 500);
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook (RBAC: SETTINGS_UPDATE)
 */
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = requirePermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();

    // Validate input
    const validation = createWebhookSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0].message,
        'VALIDATION_ERROR',
        400,
      );
    }

    const data = validation.data;

    // Validate events
    const invalidEvents = data.events.filter(
      (e) => !(VALID_EVENTS as readonly string[]).includes(e) && e !== '*'
    );
    if (invalidEvents.length > 0) {
      return errorResponse(
        `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
        'VALIDATION_ERROR',
        400,
      );
    }

    // Validate URL based on type
    const urlError = validateWebhookUrl(data.url, data.type);
    if (urlError) {
      return errorResponse(urlError, 'VALIDATION_ERROR', 400);
    }

    const webhook = await db.webhookIntegration.create({
      data: {
        name: data.name,
        type: data.type,
        url: data.url,
        events: JSON.stringify(data.events),
        secret: data.secret || null,
        isActive: true,
        failureCount: 0,
        organizationId: ctx.organizationId || '',
        createdById: ctx.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    log.info('Webhook created', { id: webhook.id, type: data.type, createdBy: ctx.userId });

    // Return with masked URL
    return NextResponse.json(
      { ...webhook, url: maskUrl(webhook.url) },
      { status: 201 },
    );
  } catch (error) {
    log.error('Error creating webhook:', error);
    return errorResponse('Failed to create webhook', 'SERVER_ERROR', 500);
  }
}

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
