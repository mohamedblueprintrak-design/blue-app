// @ts-nocheck
// @ts-check
/**
 * Webhook Service
 * خدمة الويب هوك
 *
 * Sends event notifications to Slack, Teams, or custom webhook URLs.
 * Formats payloads appropriately for each integration type.
 * Handles failures gracefully with retry and auto-disable logic.
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';

// ============================================
// Types
// ============================================

export type WebhookType = 'SLACK' | 'TEAMS' | 'CUSTOM';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  app: string;
}

// Max consecutive failures before auto-disabling a webhook
const MAX_FAILURES = 5;

// Request timeout (10 seconds)
const WEBHOOK_TIMEOUT_MS = 10_000;

// ============================================
// Payload Formatters
// ============================================

/**
 * Format payload as Slack Block Kit message
 */
function formatSlackPayload(payload: WebhookPayload): Record<string, unknown> {
  const eventLabel = payload.event.replace(/\./g, ' → ').toUpperCase();

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔔 ${eventLabel}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*App:*\n${payload.app}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date(payload.timestamp).toLocaleString()}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Data:*\n\`\`\`${JSON.stringify(payload.data, null, 2).slice(0, 2800)}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Event: \`${payload.event}\` | ${payload.app}`,
          },
        ],
      },
    ],
  };
}

/**
 * Format payload as Microsoft Teams Adaptive Card
 */
function formatTeamsPayload(payload: WebhookPayload): Record<string, unknown> {
  const eventLabel = payload.event.replace(/\./g, ' → ').toUpperCase();

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `🔔 ${eventLabel}`,
              size: 'Medium',
              weight: 'Bolder',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'App', value: payload.app },
                { title: 'Event', value: payload.event },
                { title: 'Time', value: new Date(payload.timestamp).toLocaleString() },
              ],
            },
            {
              type: 'CodeBlock',
              codeSnippet: JSON.stringify(payload.data, null, 2).slice(0, 2800),
              language: 'json',
            },
          ],
        },
      },
    ],
  };
}

/**
 * Format payload for generic/custom webhook
 */
function formatCustomPayload(payload: WebhookPayload): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>;
}

// ============================================
// Service
// ============================================

class WebhookService {
  /**
   * Trigger a webhook event for an organization.
   * Finds all active webhooks for the org that subscribe to this event,
   * then sends a POST request to each webhook URL with the formatted payload.
   *
   * Handles failures: increment failureCount, disable after MAX_FAILURES consecutive failures.
   * Timeout: 10 seconds per request.
   */
  async triggerWebhook(
    event: string,
    data: Record<string, unknown>,
    organizationId: string,
  ): Promise<void> {
    // Find all active webhooks for this org that subscribe to this event
    const webhooks = await db.webhookIntegration.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Filter to webhooks that subscribe to this event
    const matchingWebhooks = webhooks.filter((webhook) => {
      try {
        const events: string[] = JSON.parse(webhook.events);
        return events.includes(event) || events.includes('*');
      } catch {
        // If events JSON is invalid, skip this webhook
        return false;
      }
    });

    if (matchingWebhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      app: 'BluePrint',
    };

    for (const webhook of matchingWebhooks) {
      try {
        // Format payload based on webhook type
        let formattedPayload: Record<string, unknown>;
        switch (webhook.type as WebhookType) {
          case 'SLACK':
            formattedPayload = formatSlackPayload(payload);
            break;
          case 'TEAMS':
            formattedPayload = formatTeamsPayload(payload);
            break;
          case 'CUSTOM':
          default:
            formattedPayload = formatCustomPayload(payload);
            break;
        }

        // Build headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (webhook.secret) {
          headers['X-Webhook-Signature'] = webhook.secret;
        }

        // Send the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(formattedPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success: reset failure count, update lastTriggeredAt
        await db.webhookIntegration.update({
          where: { id: webhook.id },
          data: {
            failureCount: 0,
            lastTriggered: new Date(),
          },
        });

        log.info(`[Webhook] Successfully sent ${event} to ${webhook.type} webhook ${webhook.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Increment failure count
        const newFailureCount = webhook.failureCount + 1;

        // Auto-disable after MAX_FAILURES consecutive failures
        const shouldDisable = newFailureCount >= MAX_FAILURES;

        await db.webhookIntegration.update({
          where: { id: webhook.id },
          data: {
            failureCount: newFailureCount,
            isActive: shouldDisable ? false : webhook.isActive,
          },
        });

        if (shouldDisable) {
          log.warn(
            `[Webhook] Auto-disabled webhook ${webhook.id} (${webhook.name}) after ${MAX_FAILURES} consecutive failures`,
          );
        } else {
          log.error(
            `[Webhook] Failed to send ${event} to ${webhook.type} webhook ${webhook.id}: ${errorMessage}`,
          );
        }
      }
    }
  }

  /**
   * Send a test payload to a webhook
   */
  async testWebhook(webhookId: string, organizationId: string): Promise<{
    success: boolean;
    status?: number;
    error?: string;
  }> {
    const webhook = await db.webhookIntegration.findFirst({
      where: { id: webhookId, organizationId },
    });

    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from BluePrint', webhookName: webhook.name },
      app: 'BluePrint',
    };

    let formattedPayload: Record<string, unknown>;
    switch (webhook.type as WebhookType) {
      case 'SLACK':
        formattedPayload = formatSlackPayload(testPayload);
        break;
      case 'TEAMS':
        formattedPayload = formatTeamsPayload(testPayload);
        break;
      default:
        formattedPayload = formatCustomPayload(testPayload);
        break;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Signature': webhook.secret } : {}),
        },
        body: JSON.stringify(formattedPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, status: response.status, error: `HTTP ${response.status}` };
      }

      // Update lastTriggeredAt on success
      await db.webhookIntegration.update({
        where: { id: webhook.id },
        data: { lastTriggered: new Date() },
      });

      return { success: true, status: response.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
