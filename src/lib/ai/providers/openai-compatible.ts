import type { AIProvider, ChatMessage, ChatOptions, VisionMessage } from "./types";

interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
}

export class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;
  private provider: string;

  constructor(config: OpenAICompatibleConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.provider = config.provider;
  }

  /**
   * SECURITY: Returns a masked version of the API key for logging.
   * Never expose the full API key in logs or error messages.
   */
  private getMaskedKey(): string {
    if (!this.apiKey || this.apiKey.length < 8) return '***';
    return `${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}`;
  }

  /**
   * SECURITY: Sanitize error text to remove any accidentally exposed API keys.
   * Some AI providers echo back the Authorization header or key in error responses.
   */
  private sanitizeErrorText(text: string): string {
    let sanitized = text;
    // Remove Bearer token patterns
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-_]{20,}/g, 'Bearer ***');
    // Remove raw API key if it appears in the error
    if (this.apiKey && this.apiKey.length >= 8) {
      sanitized = sanitized.replaceAll(this.apiKey, this.getMaskedKey());
    }
    return sanitized.substring(0, 300);
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const body = {
      model: options.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1500,
      top_p: options.topP,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.provider === "openrouter"
          ? { "HTTP-Referer": "https://blueprint-rak.ae", "X-Title": "BluePrint AI" }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[${this.provider}] API error ${response.status}: ${this.sanitizeErrorText(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Stream chat completions token by token using OpenAI-compatible SSE format.
   * Yields each content token as it arrives from the provider.
   */
  async *chatStream(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string, void, unknown> {
    const body = {
      model: options.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1500,
      top_p: options.topP,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.provider === "openrouter"
          ? { "HTTP-Referer": "https://blueprint-rak.ae", "X-Title": "BluePrint AI" }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[${this.provider}] Streaming API error ${response.status}: ${this.sanitizeErrorText(err)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error(`[${this.provider}] No readable stream in response`);

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // skip empty/comments
          if (trimmed === "data: [DONE]") return;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async chatWithVision(messages: VisionMessage[], options: ChatOptions): Promise<string> {
    const formattedMessages = messages.map((m) => {
      if (typeof m.content === "string") return { role: m.role, content: m.content };
      const parts = m.content.map((part) => {
        if (part.type === "text") return { type: "text", text: part.text };
        if (part.type === "image_url") return { type: "image_url", image_url: part.image_url };
        if (part.type === "file_url") return { type: "image_url", image_url: { url: part.file_url?.url } };
        return { type: "text", text: "" };
      });
      return { role: m.role, content: parts };
    });

    const body = {
      model: options.model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.provider === "openrouter"
          ? { "HTTP-Referer": "https://blueprint-rak.ae", "X-Title": "BluePrint AI" }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[${this.provider}] Vision API error ${response.status}: ${this.sanitizeErrorText(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}
