/**
 * WhatsApp Service — send messages, manage templates, log messages
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import crypto from 'crypto';

// ============================================
// Send WhatsApp Message
// ============================================

export async function sendWhatsAppMessage(params: {
  to: string;
  message?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  invoiceId?: string;
  clientId?: string;
  organizationId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, message, templateName, templateParams, invoiceId, clientId, organizationId } = params;

  // Validate phone number (basic: must start with + and have 8-15 digits)
  if (!to.match(/^\+\d{8,15}$/)) {
    return { success: false, error: 'Invalid phone number format. Use +CountryCodeNumber' };
  }

  let template = null;
  let messageText = message || '';

  // If template requested, fetch it
  if (templateName) {
    template = await db.whatsAppTemplate.findFirst({
      where: { organizationId, name: templateName, status: 'APPROVED' },
    });
    if (!template) {
      return { success: false, error: `Template '${templateName}' not found or not approved` };
    }

    // Replace placeholders in body
    messageText = template.bodyText;
    if (templateParams) {
      for (const [key, value] of Object.entries(templateParams)) {
        messageText = messageText.replace(`{{${key}}}`, value);
      }
    }
  }

  if (!messageText) {
    return { success: false, error: 'No message content (provide message or templateName)' };
  }

  let messageId: string | undefined = undefined;
  let status = 'QUEUED';
  let errorMessage: string | null = null;

  // Attempt to send via WhatsApp Business API
  // In production, this would call the Meta WhatsApp Business API
  // For now, we mark as SENT (simulated) — the webhook will update status
  try {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (apiUrl && apiToken && phoneNumberId) {
      // Real API call
      const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body: messageText },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        messageId = data.messages?.[0]?.id || data.message_id || `wamid.${Math.random().toString(36).substr(2, 9)}`;
        status = 'SENT';
        log.info('WhatsApp message sent via Meta API', { messageId, to });
      } else {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        status = 'FAILED';
      }
    } else {
      // Dev mode: simulate send
      messageId = `wamid.simulated.${Math.random().toString(36).substr(2, 15)}`;
      status = 'SENT';
      log.info('WhatsApp message sent (dev mode — simulated)', { messageId, to });
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    status = 'FAILED';
    log.error('WhatsApp send exception', { error: errorMessage });
  }

  // Log the message in DB using the Meta messageId as the primary key id
  const dbMessage = await db.whatsAppMessage.create({
    data: {
      id: messageId,
      to,
      messageText,
      templateId: template?.id || null,
      templateParams: templateParams ? JSON.stringify(templateParams) : null,
      status,
      direction: 'OUTBOUND',
      errorMessage,
      invoiceId: invoiceId || null,
      clientId: clientId || null,
      organizationId,
    },
  });

  return status === 'SENT' 
    ? { success: true, messageId: dbMessage.id } 
    : { success: false, error: errorMessage || 'Failed to send WhatsApp message' };
}

// ============================================
// Send Invoice via WhatsApp
// ============================================

export async function sendInvoiceViaWhatsApp(
  invoiceId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  // Fetch invoice with client
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (!invoice.client?.phone) {
    return { success: false, error: 'Client has no phone number' };
  }

  const phone = invoice.client.phone.startsWith('+') ? invoice.client.phone : `+${invoice.client.phone}`;

  // Send message with invoice details
  const result = await sendWhatsAppMessage({
    to: phone,
    message: `Dear ${invoice.client.name},\n\nInvoice ${invoice.number}\nAmount: ${invoice.total} AED\nDue Date: ${invoice.dueDate?.toLocaleDateString() || 'N/A'}\n\nPlease log in to your portal to view and pay.\n\nBluePrint ERP`,
    invoiceId,
    clientId: invoice.client.id,
    organizationId,
  });

  return result;
}

// ============================================
// Backwards-compatible whatsappService object
// (old routes use whatsappService.sendTextMessage, etc.)
// ============================================

export const whatsappService = {
  get isConfigured(): boolean {
    return !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
  },

  async sendTextMessage(to: string, message: string, organizationId?: string) {
    const result = await sendWhatsAppMessage({ to, message, organizationId: organizationId || '' });
    return result;
  },

  async sendTemplateMessage(
    to: string,
    templateName: string,
    paramsOrLanguage: Record<string, string> | string,
    componentsOrOrgId?: unknown,
    organizationIdOverride?: string
  ) {
    let templateParams: Record<string, string> = {};
    let organizationId = '';
    if (typeof paramsOrLanguage === 'string') {
      // Language-path: explicit org override (5th param) prevents FK violation on message logging
      organizationId = typeof organizationIdOverride === 'string' ? organizationIdOverride : '';
      const components = componentsOrOrgId as Array<Record<string, unknown>> | undefined;
      if (components) {
        components.forEach((c, cIdx) => {
          const params = c.parameters as Array<Record<string, unknown>> | undefined;
          if (params) {
            params.forEach((p, pIdx) => {
              if (p.text && typeof p.text === 'string') {
                templateParams[`param_${cIdx}_${pIdx}`] = p.text;
              }
            });
          }
        });
      }
    } else {
      templateParams = paramsOrLanguage || {};
      organizationId =
        typeof organizationIdOverride === 'string' && organizationIdOverride
          ? organizationIdOverride
          : typeof componentsOrOrgId === 'string'
            ? componentsOrOrgId
            : '';
    }
    const result = await sendWhatsAppMessage({ to, templateName, templateParams, organizationId });
    return result;
  },

  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string,
    organizationId?: string
  ) {
    // For now, send text with link (document upload requires WhatsApp Business API media upload)
    const captionLine = caption ? `${caption}\n\n` : '';
    const result = await sendWhatsAppMessage({
      to,
      message: `${captionLine}Document: ${filename}\n${documentUrl}`,
      organizationId: organizationId || '',
    });
    return result;
  },

  get verifyToken(): string {
    return process.env.WHATSAPP_VERIFY_TOKEN || 'blueprint_verify_token';
  },

  verifyWebhookSignature(signature: string, payload: string): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET || 'blueprint_app_secret';
    if (!signature || !signature.startsWith('sha256=')) {
      return false;
    }
    try {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');
      const receivedSignature = signature.replace('sha256=', '');
      return expectedSignature === receivedSignature;
    } catch {
      return false;
    }
  },

  async getTemplates(organizationId?: string) {
    return await db.whatsAppTemplate.findMany({
      where: organizationId ? { organizationId } : undefined,
    });
  },

  async sendInvoiceNotification(to: string, invoiceData: InvoiceNotificationData, organizationId?: string) {
    if (invoiceData.pdfUrl) {
      const caption = `فاتورة رقم ${invoiceData.number} - ${invoiceData.client}\nالمبلغ: ${invoiceData.amount} ${invoiceData.currency}\nتاريخ الاستحقاق: ${invoiceData.dueDate}`;
      return await this.sendDocument(to, invoiceData.pdfUrl, 'فاتورة PDF', caption, organizationId);
    }
    const templateParams = {
      '0': invoiceData.number,
      '1': invoiceData.client,
      '2': `${invoiceData.amount} ${invoiceData.currency}`,
      '3': invoiceData.dueDate,
    };
    return await this.sendTemplateMessage(to, 'invoice_notification', templateParams, organizationId);
  },

  async sendProjectUpdate(to: string, projectData: ProjectUpdateData, organizationId?: string) {
    const templateParams = {
      '0': projectData.name,
      '1': projectData.status,
      '2': projectData.update,
    };
    return await this.sendTemplateMessage(to, 'project_update', templateParams, organizationId);
  },
};

/** Template component types for WhatsApp template messages */
interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: TemplateParameter[];
}

/** Template parameter for dynamic content in template messages */
interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'document' | 'image';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  document?: {
    id: string;
    filename?: string;
  };
  image?: {
    id: string;
  };
}

/** Invoice data for invoice notification messages */
interface InvoiceNotificationData {
  number: string;
  client: string;
  amount: number;
  currency: string;
  dueDate: string;
  pdfUrl?: string;
}

/** Project update data for project update messages */
interface ProjectUpdateData {
  name: string;
  status: string;
  update: string;
}

// Re-export types for backwards compat
export type { TemplateComponent, InvoiceNotificationData, ProjectUpdateData };
