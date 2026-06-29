/**
 * AI Chat API hooks
 * Uses /api/ai/chat endpoint with SSE streaming
 */

'use client';

import { useAuthStore } from '@/store/auth-store';

export interface StreamChatOptions {
  message?: string;
  model?: string;
  modelId?: string;
  history?: Array<{ role: string; content: string }>;
  skill?: string;
  skillParams?: Record<string, unknown>;
  pageContext?: string;
  contextType?: 'project' | 'mun' | 'financial' | 'overdue' | undefined;
  conversationId?: string;
  language?: string;
  projectId?: string;
}

export interface StreamChatResult {
  content: string;
  conversationId: string;
  provider: string;
  model: string;
}

/**
 * Send a chat message and consume the SSE stream token by token.
 *
 * The server responds with SSE events:
 *   data: {"type":"token","content":"..."}\n\n
 *   data: {"type":"DONE","message":{...}}\n\n
 *   data: {"type":"error","error":"..."}\n\n
 *
 * @param data  Request payload
 * @param onToken  Called for each token chunk as it arrives
 * @returns The final result after the stream completes
 */
export async function streamAIChat(
  data: StreamChatOptions,
  onToken: (token: string) => void,
): Promise<StreamChatResult> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  // If the server returned a non-streaming error (e.g. 400/503), parse as JSON
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const json = await response.json();
    if (json.error) {
      throw new Error(json.message || json.error);
    }
    // Fallback: server returned JSON instead of SSE (shouldn't happen but handle gracefully)
    onToken(json.message || '');
    return {
      content: json.message || '',
      conversationId: json.conversationId || '',
      provider: json.provider || '',
      model: json.model || '',
    };
  }

  // Consume the SSE stream
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let result: StreamChatResult = { content: '', conversationId: '', provider: '', model: '' };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === 'token' && event.content) {
              fullContent += event.content;
              onToken(event.content);
            } else if (event.type === 'done' && event.message) {
              result = {
                content: event.message.content || fullContent,
                conversationId: event.message.conversationId || '',
                provider: event.message.provider || '',
                model: event.message.model || '',
              };
            } else if (event.type === 'error') {
              throw new Error(event.error || 'AI streaming error');
            }
          } catch (parseErr) {
            // If it's our own thrown error, re-throw it
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
              throw parseErr;
            }
            // Otherwise skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Ensure result has the full content
  if (!result.content) {
    result.content = fullContent;
  }

  return result;
}

/**
 * Legacy non-streaming hook (kept for backward compatibility).
 * Prefer `streamAIChat` for new code.
 */
export function useAIChat() {
  const _isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return {
    mutateAsync: async (data: StreamChatOptions) => {
      let _fullContent = '';
      const result = await streamAIChat(data, (token) => {
        _fullContent += token;
      });
      return {
        message: result.content,
        conversationId: result.conversationId,
        provider: result.provider,
        model: result.model,
      };
    },
  };
}
