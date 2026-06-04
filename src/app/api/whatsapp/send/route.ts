/**
 * WhatsApp Send Message API Route
 * مسار إرسال رسائل واتساب للأعمال
 *
 * POST /api/whatsapp/send
 *
 * Sends WhatsApp messages via the Cloud API.
 * Requires SETTINGS_UPDATE permission.
 * Rate limited: 10 req/min (strict tier).
 *
 * Supported message types:
 * - text: Plain text message (supports Arabic)
 * - template: Pre-approved template message
 * - document: Document attachment (PDF, etc.)
 * - invoice: Invoice notification (template + optional PDF)
 * - project: Project update notification
 */

import { NextRequest } from 'next/server';
import { whatsappService } from '@/lib/services/whatsapp.service';
import type { TemplateComponent, InvoiceNotificationData, ProjectUpdateData } from '@/lib/services/whatsapp.service';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  handleApiError,
} from '@/app/api/utils/response';
import { RateLimiter } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

// ============================================
// Rate Limiter: 10 req/min for WhatsApp sends
// ============================================
const whatsappRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
  keyPrefix: 'whatsapp-send',
});

// ============================================
// Phone Number Validation
// ============================================

const PHONE_REGEX = /^[1-9]\d{6,14}$/;

function isValidPhoneNumber(phone: string): boolean {
  // Strip common formatting characters
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  return PHONE_REGEX.test(cleaned);
}

// ============================================
// Request Body Types
// ============================================

interface SendTextBody {
  type: 'text';
  to: string;
  message: string;
  clientId?: string; // Optional: link to Client record
}

interface SendTemplateBody {
  type: 'template';
  to: string;
  template: string;
  language?: string;
  components?: TemplateComponent[];
  clientId?: string; // Optional: link to Client record
}

interface SendDocumentBody {
  type: 'document';
  to: string;
  document: {
    url: string;
    filename: string;
    caption?: string;
  };
  clientId?: string; // Optional: link to Client record
}

interface SendInvoiceBody {
  type: 'invoice';
  to: string;
  invoice: InvoiceNotificationData;
  clientId?: string; // Optional: link to Client record
}

interface SendProjectBody {
  type: 'project';
  to: string;
  project: ProjectUpdateData;
  clientId?: string; // Optional: link to Client record
}

type SendRequestBody =
  | SendTextBody
  | SendTemplateBody
  | SendDocumentBody
  | SendInvoiceBody
  | SendProjectBody;

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  // Step 1: Auth check — require SETTINGS_UPDATE permission
  const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
  if ('error' in rbac) return rbac.error;

  const { user } = rbac;

  // Step 2: Rate limit check
  const clientIp = getClientIP(request.headers);
  const rateLimitResult = await whatsappRateLimiter.check(clientIp || user.userId);
  if (!rateLimitResult.allowed) {
    log.warn('[WhatsApp API] Rate limit exceeded', { clientIp, userId: user.userId });
    return errorResponse(
      'تم تجاوز الحد المسموح من رسائل واتساب. يرجى المحاولة لاحقاً.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  // Step 3: Parse and validate request body
  let body: SendRequestBody;
  try {
    body = await request.json() as SendRequestBody;
  } catch {
    return validationErrorResponse('Invalid request body');
  }

  // Validate message type
  const validTypes = ['text', 'template', 'document', 'invoice', 'project'];
  if (!body.type || !validTypes.includes(body.type)) {
    return validationErrorResponse(
      `Invalid message type. Must be one of: ${validTypes.join(', ')}`,
      'type'
    );
  }

  // Validate recipient phone number
  if (!body.to || !isValidPhoneNumber(body.to)) {
    return validationErrorResponse(
      'Invalid recipient phone number. Must be in international format (e.g., 971501234567)',
      'to'
    );
  }

  // Step 4: Check if WhatsApp service is configured
  if (!whatsappService.isConfigured) {
    return errorResponse(
      'WhatsApp Business API is not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.',
      'WHATSAPP_NOT_CONFIGURED',
      503
    );
  }

  // Step 5: Dispatch based on message type
  try {
    let result;

    switch (body.type) {
      case 'text': {
        const textBody = body as SendTextBody;
        if (!textBody.message || textBody.message.trim().length === 0) {
          return validationErrorResponse('Message body cannot be empty', 'message');
        }
        if (textBody.message.length > 4096) {
          return validationErrorResponse('Message body exceeds 4096 character limit', 'message');
        }
        result = await whatsappService.sendTextMessage(textBody.to, textBody.message);
        break;
      }

      case 'template': {
        const templateBody = body as SendTemplateBody;
        if (!templateBody.template) {
          return validationErrorResponse('Template name is required', 'template');
        }
        result = await whatsappService.sendTemplateMessage(
          templateBody.to,
          templateBody.template,
          templateBody.language || 'ar',
          templateBody.components
        );
        break;
      }

      case 'document': {
        const docBody = body as SendDocumentBody;
        if (!docBody.document?.url) {
          return validationErrorResponse('Document URL is required', 'document.url');
        }
        if (!docBody.document?.filename) {
          return validationErrorResponse('Document filename is required', 'document.filename');
        }
        result = await whatsappService.sendDocument(
          docBody.to,
          docBody.document.url,
          docBody.document.filename,
          docBody.document.caption
        );
        break;
      }

      case 'invoice': {
        const invoiceBody = body as SendInvoiceBody;
        if (!invoiceBody.invoice?.number) {
          return validationErrorResponse('Invoice number is required', 'invoice.number');
        }
        if (!invoiceBody.invoice?.client) {
          return validationErrorResponse('Client name is required', 'invoice.client');
        }
        if (typeof invoiceBody.invoice?.amount !== 'number' || invoiceBody.invoice.amount <= 0) {
          return validationErrorResponse('Invoice amount must be a positive number', 'invoice.amount');
        }
        result = await whatsappService.sendInvoiceNotification(invoiceBody.to, invoiceBody.invoice);
        break;
      }

      case 'project': {
        const projectBody = body as SendProjectBody;
        if (!projectBody.project?.name) {
          return validationErrorResponse('Project name is required', 'project.name');
        }
        if (!projectBody.project?.status) {
          return validationErrorResponse('Project status is required', 'project.status');
        }
        if (!projectBody.project?.update) {
          return validationErrorResponse('Project update text is required', 'project.update');
        }
        result = await whatsappService.sendProjectUpdate(projectBody.to, projectBody.project);
        break;
      }

      default: {
        const _exhaustive: never = body;
        return validationErrorResponse(`Unsupported message type: ${(_exhaustive as SendRequestBody).type}`);
      }
    }

    if (result.success) {
      log.info('[WhatsApp API] Message sent successfully', {
        type: body.type,
        to: body.to,
        messageId: result.messageId,
        userId: user.userId,
      });

      return successResponse({
        messageId: result.messageId,
        type: body.type,
        to: body.to,
        status: 'sent',
      });
    } else {
      log.warn('[WhatsApp API] Message send failed', {
        type: body.type,
        to: body.to,
        error: result.error,
        userId: user.userId,
      });

      return errorResponse(
        result.error || 'Failed to send WhatsApp message',
        'WHATSAPP_SEND_FAILED',
        502
      );
    }
  } catch (error) {
    return handleApiError('Error sending WhatsApp message', error);
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
