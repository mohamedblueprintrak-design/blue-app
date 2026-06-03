/**
 * WhatsApp Cloud API Service
 * خدمة واتساب للأعمال — تكامل مع Meta Cloud API
 *
 * Implements real HTTP calls to the WhatsApp Business Cloud API.
 * API Base: https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}
 *
 * Supports:
 * - Text messages (including Arabic)
 * - Template messages
 * - Document messages (PDF, etc.)
 * - Invoice notifications
 * - Project update notifications
 * - Webhook signature verification
 * - Message status tracking
 */

import { log } from '@/lib/logger';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

/** Result of a WhatsApp API call to send a message */
interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

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

/** Message status from webhook/status queries */
interface MessageStatusResult {
  status: string;
  timestamp: string;
}

/** WhatsApp Cloud API error response shape */
interface WhatsAppApiError {
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/** WhatsApp Cloud API success response shape */
interface WhatsAppApiSuccess {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/** Predefined template definition */
interface WhatsAppTemplate {
  name: string;
  language: string;
  category: string;
  description: string;
  components: TemplateComponent[];
}

// ============================================
// WhatsApp Service
// ============================================

class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;
  private businessAccountId: string;
  private appSecret: string;
  private webhookVerifyToken: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.appSecret = process.env.WHATSAPP_APP_SECRET || '';
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  /** Check if the WhatsApp integration is configured */
  get isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /** Base URL for the WhatsApp Cloud API */
  private get baseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  /** Common headers for WhatsApp API requests */
  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // ============================================
  // Send Text Message
  // ============================================

  /**
   * Send a plain text message via WhatsApp Cloud API.
   * Supports Arabic and other Unicode text natively.
   *
   * @param to - Recipient phone number in international format (e.g., "971501234567")
   * @param message - Text message body
   * @returns Send result with success status and WhatsApp message ID
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot send text message');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const sanitizedTo = this.sanitizePhoneNumber(to);
    if (!sanitizedTo) {
      return { success: false, error: `Invalid phone number format: ${to}` };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizedTo,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    log.info('[WhatsApp] Sending text message', { to: sanitizedTo, messageLength: message.length });

    try {
      const response = await fetch(this.baseUrl + '/messages', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json() as WhatsAppApiSuccess | WhatsAppApiError;

      if (!response.ok) {
        const apiError = data as WhatsAppApiError;
        const errorMsg = apiError.error?.message || `WhatsApp API error: ${response.status}`;
        log.error('[WhatsApp] Text message failed', { to: sanitizedTo, status: response.status, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const successData = data as WhatsAppApiSuccess;
      const messageId = successData.messages?.[0]?.id;
      log.info('[WhatsApp] Text message sent successfully', { to: sanitizedTo, messageId });

      return { success: true, messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error sending text message';
      log.error('[WhatsApp] Text message exception', error, { to: sanitizedTo });
      return { success: false, error: errorMsg };
    }
  }

  // ============================================
  // Send Template Message
  // ============================================

  /**
   * Send a template message via WhatsApp Cloud API.
   * Templates must be pre-approved in the Meta Business Manager.
   *
   * @param to - Recipient phone number in international format
   * @param templateName - Name of the approved template
   * @param languageCode - Language code (e.g., "ar", "en")
   * @param components - Optional template components with dynamic parameters
   * @returns Send result with success status and WhatsApp message ID
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: TemplateComponent[]
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot send template message');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const sanitizedTo = this.sanitizePhoneNumber(to);
    if (!sanitizedTo) {
      return { success: false, error: `Invalid phone number format: ${to}` };
    }

    const template: Record<string, unknown> = {
      name: templateName,
      language: {
        code: languageCode,
      },
    };

    if (components && components.length > 0) {
      template.components = components;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizedTo,
      type: 'template',
      template,
    };

    log.info('[WhatsApp] Sending template message', {
      to: sanitizedTo,
      templateName,
      languageCode,
      hasComponents: !!components,
    });

    try {
      const response = await fetch(this.baseUrl + '/messages', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json() as WhatsAppApiSuccess | WhatsAppApiError;

      if (!response.ok) {
        const apiError = data as WhatsAppApiError;
        const errorMsg = apiError.error?.message || `WhatsApp API error: ${response.status}`;
        log.error('[WhatsApp] Template message failed', { to: sanitizedTo, templateName, status: response.status, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const successData = data as WhatsAppApiSuccess;
      const messageId = successData.messages?.[0]?.id;
      log.info('[WhatsApp] Template message sent successfully', { to: sanitizedTo, templateName, messageId });

      return { success: true, messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error sending template message';
      log.error('[WhatsApp] Template message exception', error, { to: sanitizedTo, templateName });
      return { success: false, error: errorMsg };
    }
  }

  // ============================================
  // Send Document
  // ============================================

  /**
   * Send a document (PDF, etc.) via WhatsApp Cloud API.
   * The document must be hosted at a publicly accessible URL or uploaded as a media object.
   *
   * @param to - Recipient phone number in international format
   * @param documentUrl - Publicly accessible URL of the document
   * @param filename - Display name for the document
   * @param caption - Optional caption text
   * @returns Send result with success status and WhatsApp message ID
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot send document');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const sanitizedTo = this.sanitizePhoneNumber(to);
    if (!sanitizedTo) {
      return { success: false, error: `Invalid phone number format: ${to}` };
    }

    const document: Record<string, string> = {
      link: documentUrl,
      filename,
    };

    if (caption) {
      document.caption = caption;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizedTo,
      type: 'document',
      document,
    };

    log.info('[WhatsApp] Sending document', { to: sanitizedTo, filename, hasCaption: !!caption });

    try {
      const response = await fetch(this.baseUrl + '/messages', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json() as WhatsAppApiSuccess | WhatsAppApiError;

      if (!response.ok) {
        const apiError = data as WhatsAppApiError;
        const errorMsg = apiError.error?.message || `WhatsApp API error: ${response.status}`;
        log.error('[WhatsApp] Document message failed', { to: sanitizedTo, filename, status: response.status, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const successData = data as WhatsAppApiSuccess;
      const messageId = successData.messages?.[0]?.id;
      log.info('[WhatsApp] Document message sent successfully', { to: sanitizedTo, filename, messageId });

      return { success: true, messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error sending document';
      log.error('[WhatsApp] Document message exception', error, { to: sanitizedTo, filename });
      return { success: false, error: errorMsg };
    }
  }

  // ============================================
  // Send Invoice Notification
  // ============================================

  /**
   * Send an invoice notification via WhatsApp.
   * Uses a template message with invoice details, and optionally attaches a PDF.
   *
   * @param to - Recipient phone number in international format
   * @param invoiceData - Invoice details for the notification
   * @returns Send result with success status and WhatsApp message ID
   */
  async sendInvoiceNotification(
    to: string,
    invoiceData: InvoiceNotificationData
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot send invoice notification');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    log.info('[WhatsApp] Sending invoice notification', { to, invoiceNumber: invoiceData.number });

    // If a PDF URL is provided, send the document with a caption
    if (invoiceData.pdfUrl) {
      const caption = `فاتورة رقم ${invoiceData.number} - ${invoiceData.client}\nالمبلغ: ${invoiceData.amount} ${invoiceData.currency}\nتاريخ الاستحقاق: ${invoiceData.dueDate}`;

      const docResult = await this.sendDocument(
        to,
        invoiceData.pdfUrl,
        `invoice-${invoiceData.number}.pdf`,
        caption
      );

      if (docResult.success) {
        // Also store in DB
        await this.storeMessageRecord({
          toNumber: to,
          direction: 'outbound',
          type: 'document',
          templateName: 'invoice_notification',
          content: JSON.stringify(invoiceData),
          relatedType: 'invoice',
          messageId: docResult.messageId,
          metadata: JSON.stringify({ source: 'invoice_notification', hasPdf: true }),
        });
      }

      return docResult;
    }

    // Otherwise, send a template message
    const components: TemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: invoiceData.number },
          { type: 'text', text: invoiceData.client },
          {
            type: 'currency',
            currency: {
              fallback_value: `${invoiceData.amount} ${invoiceData.currency}`,
              code: invoiceData.currency,
              amount_1000: Math.round(invoiceData.amount * 1000),
            },
          },
          { type: 'text', text: invoiceData.dueDate },
        ],
      },
    ];

    const result = await this.sendTemplateMessage(
      to,
      'invoice_notification',
      'ar',
      components
    );

    if (result.success) {
      await this.storeMessageRecord({
        toNumber: to,
        direction: 'outbound',
        type: 'template',
        templateName: 'invoice_notification',
        templateParams: JSON.stringify(components),
        content: JSON.stringify(invoiceData),
        relatedType: 'invoice',
        messageId: result.messageId,
        metadata: JSON.stringify({ source: 'invoice_notification', hasPdf: false }),
      });
    }

    return result;
  }

  // ============================================
  // Send Project Update
  // ============================================

  /**
   * Send a project update notification via WhatsApp.
   *
   * @param to - Recipient phone number in international format
   * @param projectData - Project update details
   * @returns Send result with success status and WhatsApp message ID
   */
  async sendProjectUpdate(
    to: string,
    projectData: ProjectUpdateData
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot send project update');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    log.info('[WhatsApp] Sending project update', { to, projectName: projectData.name });

    const components: TemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: projectData.name },
          { type: 'text', text: projectData.status },
          { type: 'text', text: projectData.update },
        ],
      },
    ];

    const result = await this.sendTemplateMessage(
      to,
      'project_update',
      'ar',
      components
    );

    if (result.success) {
      await this.storeMessageRecord({
        toNumber: to,
        direction: 'outbound',
        type: 'template',
        templateName: 'project_update',
        templateParams: JSON.stringify(components),
        content: JSON.stringify(projectData),
        relatedType: 'project',
        messageId: result.messageId,
        metadata: JSON.stringify({ source: 'project_update' }),
      });
    }

    return result;
  }

  // ============================================
  // Webhook Signature Verification
  // ============================================

  /**
   * Verify the signature of an incoming webhook request from Meta.
   * Uses HMAC-SHA256 with the App Secret to verify the X-Hub-Signature-256 header.
   *
   * @param signature - The value of the X-Hub-Signature-256 header (format: "sha256=<hex>")
   * @param payload - The raw request body as a string
   * @returns True if the signature is valid, false otherwise
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    if (!this.appSecret) {
      log.warn('[WhatsApp] App secret not configured — cannot verify webhook signature');
      return false;
    }

    if (!signature || !signature.startsWith('sha256=')) {
      log.warn('[WhatsApp] Invalid signature format', { signaturePrefix: signature?.substring(0, 10) });
      return false;
    }

    try {
      // Use Node.js crypto for HMAC-SHA256 verification
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require('crypto') as typeof import('crypto');
      const expectedSignature = nodeCrypto
        .createHmac('sha256', this.appSecret)
        .update(payload)
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');

      // Timing-safe comparison to prevent timing attacks
      const isValid = nodeCrypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        log.warn('[WhatsApp] Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      log.error('[WhatsApp] Webhook signature verification error', error);
      return false;
    }
  }

  /**
   * Get the configured webhook verify token for Meta's webhook verification.
   */
  get verifyToken(): string {
    return this.webhookVerifyToken;
  }

  // ============================================
  // Get Message Status
  // ============================================

  /**
   * Query the status of a previously sent message.
   *
   * @param messageId - The WhatsApp message ID returned from a send operation
   * @returns Message status and timestamp, or null if not found
   */
  async getMessageStatus(messageId: string): Promise<MessageStatusResult | null> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot get message status');
      return null;
    }

    log.debug('[WhatsApp] Getting message status', { messageId });

    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${messageId}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const data = await response.json() as WhatsAppApiError;
        log.error('[WhatsApp] Get message status failed', { messageId, status: response.status, error: data.error?.message });
        return null;
      }

      const data = await response.json() as { status?: string; timestamp?: string };
      return {
        status: data.status || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      log.error('[WhatsApp] Get message status exception', error, { messageId });
      return null;
    }
  }

  // ============================================
  // Mark Message as Read
  // ============================================

  /**
   * Mark an incoming message as read.
   *
   * @param messageId - The WhatsApp message ID to mark as read
   * @returns True if the operation succeeded
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.isConfigured) {
      log.warn('[WhatsApp] Service not configured — cannot mark message as read');
      return false;
    }

    log.debug('[WhatsApp] Marking message as read', { messageId });

    try {
      const response = await fetch(this.baseUrl + '/messages', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as WhatsAppApiError;
        log.error('[WhatsApp] Mark as read failed', { messageId, status: response.status, error: data.error?.message });
        return false;
      }

      log.info('[WhatsApp] Message marked as read', { messageId });
      return true;
    } catch (error) {
      log.error('[WhatsApp] Mark as read exception', error, { messageId });
      return false;
    }
  }

  // ============================================
  // Get Templates from Meta API
  // ============================================

  /**
   * Fetch WhatsApp message templates from the Meta Business API.
   * Falls back to predefined templates if the API call fails.
   *
   * @returns Array of template definitions
   */
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    if (!this.isConfigured || !this.businessAccountId) {
      log.warn('[WhatsApp] Service not fully configured — returning predefined templates');
      return this.getPredefinedTemplates();
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.businessAccountId}/message_templates`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        log.warn('[WhatsApp] Failed to fetch templates from Meta API, using predefined templates');
        return this.getPredefinedTemplates();
      }

      const data = await response.json() as { data: Array<Record<string, unknown>> };
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((t) => ({
          name: (t.name as string) || '',
          language: ((t.language as string) || 'ar'),
          category: ((t.category as string) || ''),
          description: '',
          components: [],
        }));
      }

      return this.getPredefinedTemplates();
    } catch (error) {
      log.error('[WhatsApp] Get templates exception', error);
      return this.getPredefinedTemplates();
    }
  }

  // ============================================
  // Phone Number Sanitization
  // ============================================

  /**
   * Sanitize and validate a phone number for WhatsApp.
   * WhatsApp requires international format without + or spaces (e.g., "971501234567").
   *
   * @param phone - Phone number in any common format
   * @returns Sanitized phone number or empty string if invalid
   */
  private sanitizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remove all non-digit characters
    let sanitized = phone.replace(/[^\d]/g, '');

    // Remove leading zeros after country code
    if (sanitized.startsWith('0') && sanitized.length > 1) {
      // Assume local format without country code — this needs the country code
      // For UAE numbers starting with 0, replace with 971
      if (sanitized.startsWith('05')) {
        sanitized = '971' + sanitized.substring(1);
      }
    }

    // Validate: must be at least 7 digits and start with a valid country code
    if (sanitized.length < 7 || sanitized.length > 15) {
      return '';
    }

    return sanitized;
  }

  // ============================================
  // Store Message Record
  // ============================================

  /**
   * Store a WhatsApp message record in the database.
   * Called after successful message sends to maintain a log.
   */
  private async storeMessageRecord(params: {
    toNumber: string;
    direction: string;
    type: string;
    templateName?: string;
    templateParams?: string;
    content?: string;
    metadata?: string;
    relatedType?: string;
    relatedId?: string;
    clientId?: string;
    messageId?: string;
    organizationId?: string;
    fromNumber?: string;
  }): Promise<void> {
    try {
      await db.whatsAppMessage.create({
        data: {
          toNumber: params.toNumber,
          fromNumber: params.fromNumber || this.phoneNumberId,
          direction: params.direction,
          type: params.type,
          status: 'sent',
          templateName: params.templateName,
          templateParams: params.templateParams,
          content: params.content,
          metadata: params.metadata,
          relatedType: params.relatedType,
          relatedId: params.relatedId,
          clientId: params.clientId,
          messageId: params.messageId,
          organizationId: params.organizationId,
          sentAt: new Date(),
        },
      });
      log.debug('[WhatsApp] Message record stored', { toNumber: params.toNumber, messageId: params.messageId });
    } catch (error) {
      log.error('[WhatsApp] Failed to store message record', error, { toNumber: params.toNumber });
    }
  }

  // ============================================
  // Predefined Templates
  // ============================================

  /**
   * Returns predefined WhatsApp template definitions for engineering consultancy.
   * These templates must be created and approved in the Meta Business Manager
   * before they can be used.
   */
  private getPredefinedTemplates(): WhatsAppTemplate[] {
    return [
      {
        name: 'invoice_notification',
        language: 'ar',
        category: 'UTILITY',
        description: 'إشعار فاتورة — يُرسل عند إصدار فاتورة جديدة للعميل',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'رقم الفاتورة' },
              { type: 'text', text: 'اسم العميل' },
              { type: 'currency', currency: { fallback_value: '0 AED', code: 'AED', amount_1000: 0 } },
              { type: 'text', text: 'تاريخ الاستحقاق' },
            ],
          },
        ],
      },
      {
        name: 'project_update',
        language: 'ar',
        category: 'UTILITY',
        description: 'تحديث مشروع — يُرسل عند تغيير حالة المشروع أو إضافة تحديث',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'اسم المشروع' },
              { type: 'text', text: 'الحالة' },
              { type: 'text', text: 'التحديث' },
            ],
          },
        ],
      },
      {
        name: 'meeting_reminder',
        language: 'ar',
        category: 'UTILITY',
        description: 'تذكير اجتماع — يُرسل قبل الموعد بوقت كافٍ',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'عنوان الاجتماع' },
              { type: 'date_time', date_time: { fallback_value: 'التاريخ والوقت' } },
              { type: 'text', text: 'الموقع' },
            ],
          },
        ],
      },
      {
        name: 'document_ready',
        language: 'ar',
        category: 'UTILITY',
        description: 'مستند جاهز — يُرسل عند إعداد مستند للعميل',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'اسم المستند' },
              { type: 'text', text: 'نوع المستند' },
            ],
          },
        ],
      },
      {
        name: 'payment_confirmation',
        language: 'ar',
        category: 'UTILITY',
        description: 'تأكيد دفع — يُرسل عند استلام دفعة من العميل',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'رقم الفاتورة' },
              {
                type: 'currency',
                currency: { fallback_value: '0 AED', code: 'AED', amount_1000: 0 },
              },
              { type: 'date_time', date_time: { fallback_value: 'تاريخ الدفع' } },
            ],
          },
        ],
      },
    ];
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();

// Re-export types for use in API routes
export type {
  WhatsAppSendResult,
  TemplateComponent,
  TemplateParameter,
  InvoiceNotificationData,
  ProjectUpdateData,
  MessageStatusResult,
  WhatsAppTemplate,
};
