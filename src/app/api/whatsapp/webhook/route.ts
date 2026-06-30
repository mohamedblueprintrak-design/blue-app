/**
 * WhatsApp Webhook API Route
 * مسار استقبال أحداث واتساب (Webhook)
 *
 * GET /api/whatsapp/webhook  — Webhook verification (required by Meta)
 * POST /api/whatsapp/webhook — Receive incoming messages and status updates
 *
 * This endpoint is called by Meta's servers. No auth required.
 * Webhook signature is verified using WHATSAPP_APP_SECRET.
 * The GET verification uses WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 *
 * Incoming messages are stored in the WhatsAppMessage model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/services/whatsapp.service';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';

// ============================================
// GET Handler — Webhook Verification
// ============================================

/**
 * Meta requires webhook verification when setting up the WhatsApp integration.
 * The flow is:
 * 1. Meta sends a GET request with hub.mode=subscribe, hub.verify_token, and hub.challenge
 * 2. We verify hub.verify_token matches our WHATSAPP_WEBHOOK_VERIFY_TOKEN
 * 3. We respond with hub.challenge to confirm ownership
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  log.info('[WhatsApp Webhook] Verification request received', { mode, hasToken: !!token });

  // Verify the mode and token
  if (mode === 'subscribe' && token === whatsappService.verifyToken) {
    log.info('[WhatsApp Webhook] Verification successful');
    // Return the challenge as plain text (Meta expects this exact response)
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  log.warn('[WhatsApp Webhook] Verification failed', { mode, tokenProvided: !!token });
  return NextResponse.json(
    { error: 'Verification failed' },
    { status: 403 }
  );
}

// ============================================
// POST Handler — Incoming Messages & Status Updates
// ============================================

/**
 * Receives incoming WhatsApp messages and delivery status updates from Meta.
 *
 * Webhook payload structure:
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
 *     "changes": [{
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
 *         "contacts": [{ "profile": { "name": "..." }, "wa_id": "..." }],
 *         "messages": [{ "id": "...", "from": "...", "timestamp": "...", "type": "text", "text": { "body": "..." } }],
 *         "statuses": [{ "id": "...", "status": "delivered", "timestamp": "...", "recipient_id": "..." }]
 *       },
 *       "field": "messages"
 *     }]
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  // Step 1: Verify webhook signature
  const signature = request.headers.get('x-hub-signature-256');
  const rawBody = await request.text();

  if (!signature || !whatsappService.verifyWebhookSignature(signature, rawBody)) {
    log.warn('[WhatsApp Webhook] Missing or invalid signature — rejecting payload');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Step 2: Parse the payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    log.warn('[WhatsApp Webhook] Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Step 3: Verify the object type
  if (payload.object !== 'whatsapp_business_account') {
    log.warn('[WhatsApp Webhook] Unexpected object type', { object: payload.object });
    return NextResponse.json({ error: 'Unexpected object type' }, { status: 400 });
  }

  // Step 4: Process entries
  const entries = payload.entry as Array<Record<string, unknown>> | undefined;
  if (!entries || !Array.isArray(entries)) {
    log.warn('[WhatsApp Webhook] No entries in payload');
    return NextResponse.json({ status: 'no_entries' }, { status: 200 });
  }

  for (const entry of entries) {
    const changes = entry.changes as Array<Record<string, unknown>> | undefined;
    if (!changes || !Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;

      // Process incoming messages
      const messages = value.messages as Array<Record<string, unknown>> | undefined;
      if (messages && Array.isArray(messages)) {
        await processIncomingMessages(messages, value);
      }

      // Process status updates
      const statuses = value.statuses as Array<Record<string, unknown>> | undefined;
      if (statuses && Array.isArray(statuses)) {
        await processStatusUpdates(statuses);
      }
    }
  }

  // Always return 200 quickly to acknowledge receipt (Meta requirement)
  return NextResponse.json({ status: 'received' }, { status: 200 });
}

// ============================================
// Process Incoming Messages
// ============================================

async function processIncomingMessages(
  messages: Array<Record<string, unknown>>,
  value: Record<string, unknown>
): Promise<void> {
  const metadata = value.metadata as Record<string, string> | undefined;
  const phoneNumberId = metadata?.display_phone_number || '';

  const contacts = value.contacts as Array<Record<string, unknown>> | undefined;
  const contactName = contacts?.[0]?.profile
    ? (contacts[0].profile as Record<string, string>)?.name || ''
    : '';

  for (const message of messages) {
    const messageId = message.id as string;
    const from = message.from as string;
    const timestamp = message.timestamp as string;
    const messageType = message.type as string;

    log.info('[WhatsApp Webhook] Incoming message', {
      messageId,
      from,
      type: messageType,
      contactName,
    });

    try {
      // Extract message content based on type
      let content = '';
      switch (messageType) {
        case 'text': {
          const textObj = message.text as Record<string, string> | undefined;
          content = textObj?.body || '';
          break;
        }
        case 'document': {
          const docObj = message.document as Record<string, string> | undefined;
          content = JSON.stringify({
            filename: docObj?.filename || '',
            caption: docObj?.caption || '',
            id: docObj?.id || '',
          });
          break;
        }
        case 'image': {
          const imgObj = message.image as Record<string, string> | undefined;
          content = JSON.stringify({
            caption: imgObj?.caption || '',
            id: imgObj?.id || '',
          });
          break;
        }
        default:
          content = JSON.stringify(message[messageType] || {});
      }

      // Try to link incoming message to an existing client by phone number
      let clientId: string | undefined;
      try {
        const matchingClient = await db.client.findFirst({
          where: {
            OR: [
              { whatsapp: { contains: from.replace(/[^0-9]/g, '') } },
              { phone: { contains: from.replace(/[^0-9]/g, '') } },
            ],
            deletedAt: null,
          },
          select: { id: true },
        });
        clientId = matchingClient?.id;
      } catch {
        // Client lookup is best-effort
      }

      // Store the incoming message
      await db.whatsAppMessage.create({
        data: {
          id: messageId,
          from,
          to: phoneNumberId,
          direction: 'INBOUND',
          status: 'DELIVERED',
          messageText: content,
          clientId,
          organizationId: 'default',
        },
      });

      log.info('[WhatsApp Webhook] Incoming message stored', { messageId, from });
    } catch (error) {
      log.error('[WhatsApp Webhook] Failed to store incoming message', error, { messageId });
    }
  }
}

// ============================================
// Process Status Updates
// ============================================

async function processStatusUpdates(
  statuses: Array<Record<string, unknown>>
): Promise<void> {
  for (const status of statuses) {
    const messageId = status.id as string;
    const statusValue = status.status as string;
    const recipientId = status.recipient_id as string;

    log.info('[WhatsApp Webhook] Status update', {
      messageId,
      status: statusValue,
      recipientId,
    });

    try {
      // Find existing message record and update status
      const existing = await db.whatsAppMessage.findFirst({
        where: { id: messageId },
      });

      if (existing) {
        const updateData: any = {
          status: statusValue.toUpperCase(),
        };

        if (statusValue === 'failed') {
          const errorCodes = status.errors as Array<Record<string, unknown>> | undefined;
          if (errorCodes && errorCodes.length > 0) {
            updateData.errorMessage = JSON.stringify(errorCodes[0]);
          } else {
            updateData.errorMessage = 'Failed';
          }
        }

        await db.whatsAppMessage.update({
          where: { id: existing.id },
          data: updateData,
        });

        log.info('[WhatsApp Webhook] Message status updated', { messageId, status: statusValue });
      } else {
        // No existing record — create one for the status update
        await db.whatsAppMessage.create({
          data: {
            id: messageId,
            to: recipientId,
            direction: 'OUTBOUND',
            status: statusValue.toUpperCase(),
            organizationId: 'default',
            errorMessage: statusValue === 'failed' ? 'Failed' : null,
          },
        });

        log.info('[WhatsApp Webhook] Status record created', { messageId, status: statusValue });
      }
    } catch (error) {
      log.error('[WhatsApp Webhook] Failed to update message status', error, { messageId });
    }
  }
}
