/**
 * WhatsApp Service — send messages, manage templates, log messages
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';

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

  // Log the message in DB
  const dbMessage = await db.whatsAppMessage.create({
    data: {
      to,
      messageText,
      templateId: template?.id || null,
      templateParams: templateParams ? JSON.stringify(templateParams) : null,
      status: 'QUEUED',
      direction: 'OUTBOUND',
      invoiceId: invoiceId || null,
      clientId: clientId || null,
      organizationId,
    },
  });

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
        await db.whatsAppMessage.update({
          where: { id: dbMessage.id },
          data: { status: 'SENT' },
        });
        log.info('WhatsApp message sent', { messageId: dbMessage.id, to, wamid: data.message_id });
        return { success: true, messageId: dbMessage.id };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
        await db.whatsAppMessage.update({
          where: { id: dbMessage.id },
          data: { status: 'FAILED', errorMessage: errorMsg },
        });
        return { success: false, error: errorMsg };
      }
    } else {
      // Dev mode: simulate send
      await db.whatsAppMessage.update({
        where: { id: dbMessage.id },
        data: { status: 'SENT' },
      });
      log.info('WhatsApp message sent (dev mode — simulated)', { messageId: dbMessage.id, to });
      return { success: true, messageId: dbMessage.id };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db.whatsAppMessage.update({
      where: { id: dbMessage.id },
      data: { status: 'FAILED', errorMessage: errorMsg },
    });
    log.error('WhatsApp send failed', { messageId: dbMessage.id, error: errorMsg });
    return { success: false, error: errorMsg };
  }
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
    templateParams: Record<string, string>,
    organizationId?: string
  ) {
    const result = await sendWhatsAppMessage({ to, templateName, templateParams, organizationId: organizationId || '' });
    return result;
  },

  async sendDocument(
    to: string,
    documentUrl: string,
    caption: string,
    organizationId?: string
  ) {
    // For now, send text with link (document upload requires WhatsApp Business API media upload)
    const result = await sendWhatsAppMessage({
      to,
      message: `${caption}\n\nDocument: ${documentUrl}`,
      organizationId: organizationId || '',
    });
    return result;
  },
};

// Re-export types for backwards compat
export type { TemplateComponent, InvoiceNotificationData, ProjectUpdateData };
