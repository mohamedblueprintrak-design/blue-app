/**
 * WhatsApp Templates API Route
 * مسار قوالب رسائل واتساب
 *
 * GET /api/whatsapp/templates
 *
 * Lists available WhatsApp message templates.
 * If the WhatsApp Cloud API is fully configured and the Meta API is reachable,
 * templates are fetched from Meta. Otherwise, predefined templates are returned.
 *
 * Requires SETTINGS_UPDATE permission.
 */

import { NextRequest } from 'next/server';
import { whatsappService } from '@/lib/services/whatsapp.service';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import {
  successResponse,
  handleApiError,
  errorResponse,
} from '@/app/api/utils/response';
import { log } from '@/lib/logger';

// ============================================
// GET Handler — List Templates
// ============================================

export async function GET(request: NextRequest) {
  // Auth check — require SETTINGS_UPDATE permission
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ('error' in rbac) return rbac.error;

  try {
    // Check if WhatsApp service is configured
    if (!whatsappService.isConfigured) {
      // Even if not fully configured, return predefined templates as reference
      log.info('[WhatsApp Templates] Service not configured, returning predefined templates');
      return successResponse({
        templates: await whatsappService.getTemplates(),
        source: 'predefined',
        configured: false,
      });
    }

    // Fetch templates from Meta API (falls back to predefined on failure)
    const templates = await whatsappService.getTemplates();

    log.info('[WhatsApp Templates] Templates fetched', {
      count: templates.length,
    });

    return successResponse({
      templates,
      source: 'meta_api',
      configured: true,
    });
  } catch (error) {
    return handleApiError('Error fetching WhatsApp templates', error);
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
