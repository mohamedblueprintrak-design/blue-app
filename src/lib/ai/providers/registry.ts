/**
 * Provider Registry
 * Maps model names to provider configurations and creates provider instances
 *
 * All providers use OpenAI-compatible API format except the built-in ZAI SDK
 */

import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider, ProviderConfig } from "./types";

// ============================================
// Provider Configurations
// ============================================

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  // Gemini is first — free-tier generous quota, used as default fallback
  gemini: {
    name: "Google Gemini",
    provider: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnvVar: "GEMINI_API_KEY",
    models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
    supportsVision: true,
    supportsStreaming: true,
  },
  // Groq is second — very fast inference, generous free tier
  groq: {
    name: "Groq",
    provider: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnvVar: "GROQ_API_KEY",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768"],
    supportsVision: false,
    supportsStreaming: true,
  },
  // DeepSeek — third option, great capability
  deepseek: {
    name: "DeepSeek",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
    models: ["deepseek-chat", "deepseek-reasoner"],
    supportsVision: true,
    supportsStreaming: true,
  },
  // Mistral — fourth
  mistral: {
    name: "Mistral",
    provider: "mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnvVar: "MISTRAL_API_KEY",
    models: ["mistral-large-latest", "mistral-small-latest", "open-mistral-nemo", "codestral-latest"],
    supportsVision: true,
    supportsStreaming: true,
  },
  // OpenRouter — fifth (aggregator, uses OpenRouter key)
  openrouter: {
    name: "OpenRouter",
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    models: [
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-2.5-flash-preview",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-haiku",
      "meta-llama/llama-3.1-70b-instruct",
      "deepseek/deepseek-chat",
      "mistralai/mistral-large",
    ],
    supportsVision: true,
    supportsStreaming: true,
  },
  // HuggingFace
  huggingface: {
    name: "HuggingFace",
    provider: "huggingface",
    baseUrl: "https://api-inference.huggingface.co/v1",
    apiKeyEnvVar: "HUGGINGFACE_API_KEY",
    models: [
      "meta-llama/Llama-3.1-70B-Instruct",
      "mistralai/Mistral-7B-Instruct-v0.3",
      "Qwen/Qwen2.5-72B-Instruct",
    ],
    supportsVision: false,
    supportsStreaming: true,
  },
  // xAI Grok
  grok: {
    name: "xAI Grok",
    provider: "grok",
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnvVar: "XAI_API_KEY",
    models: ["grok-2", "grok-2-mini", "grok-beta"],
    supportsVision: false,
    supportsStreaming: true,
  },
  // OpenAI — last (quota may be exhausted on free tier)
  openai: {
    name: "OpenAI",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnvVar: "OPENAI_API_KEY",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    supportsVision: true,
    supportsStreaming: true,
  },
};

// ============================================
// Built-in ZAI SDK (Fallback)
// ============================================

export const ZAI_PROVIDER = {
  name: "BluePrint AI (Built-in)",
  provider: "zai",
  models: ["zai-default"],
  supportsVision: true,
  supportsStreaming: false,
};

// ============================================
// Provider Registry
// ============================================

class ProviderRegistry {
  private cache: Map<string, AIProvider> = new Map();

  /**
   * Get the API key for a provider from environment variables
   */
  getApiKey(providerId: string): string | null {
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) return null;
    return process.env[config.apiKeyEnvVar] || null;
  }

  /**
   * Check if a provider is configured (has API key)
   */
  private loggedMissing: Set<string> = new Set();
  isConfigured(providerId: string): boolean {
    if (providerId === "zai") return true;
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) return false;
    const key = process.env[config.apiKeyEnvVar];
    if (!key && process.env.NODE_ENV !== 'production' && !this.loggedMissing.has(providerId)) {
      this.loggedMissing.add(providerId);
      console.info(`[AI] ${config.name}: ${config.apiKeyEnvVar} not found in environment (only logging once)`);
    }
    return !!key;
  }

  /**
   * Get list of all available providers (configured ones + built-in)
   */
  getAvailableProviders(): Array<{
    id: string;
    name: string;
    models: string[];
    isBuiltIn: boolean;
  }> {
    const available: Array<{ id: string; name: string; models: string[]; isBuiltIn: boolean }> = [];
    available.push({
      id: "zai",
      name: ZAI_PROVIDER.name,
      models: [...ZAI_PROVIDER.models],
      isBuiltIn: true,
    });
    for (const [id, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (this.isConfigured(id)) {
        available.push({
          id,
          name: config.name,
          models: [...config.models],
          isBuiltIn: false,
        });
      }
    }
    return available;
  }

  /**
   * Get all models across all available providers
   */
  getAvailableModels(): Array<{
    id: string;
    name: string;
    provider: string;
    providerName: string;
    supportsVision: boolean;
  }> {
    const models: Array<{
      id: string;
      name: string;
      provider: string;
      providerName: string;
      supportsVision: boolean;
    }> = [];
    models.push({
      id: "zai-default",
      name: "BluePrint AI (Built-in)",
      provider: "zai",
      providerName: ZAI_PROVIDER.name,
      supportsVision: true,
    });
    for (const [providerId, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (this.isConfigured(providerId)) {
        for (const model of config.models) {
          const displayName = model.includes("/") ? model.split("/").pop() || model : model;
          models.push({
            id: `${providerId}:${model}`,
            name: `${config.name} - ${displayName}`,
            provider: providerId,
            providerName: config.name,
            supportsVision: config.supportsVision,
          });
        }
      }
    }
    return models;
  }

  /**
   * Create or get a provider instance
   */
  getProvider(providerId: string): AIProvider | null {
    const cacheKey = providerId;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;
    if (providerId === "zai") return null;
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) return null;
    const apiKey = this.getApiKey(providerId);
    if (!apiKey) return null;
    const provider = new OpenAICompatibleProvider({
      baseUrl: config.baseUrl,
      apiKey,
      provider: providerId,
    });
    this.cache.set(cacheKey, provider);
    return provider;
  }

  /**
   * Parse a model ID like "openai:gpt-4o" into provider and model
   */
  parseModelId(modelId: string): { provider: string; model: string } {
    if (modelId === "zai-default") return { provider: "zai", model: "zai-default" };
    const colonIndex = modelId.indexOf(":");
    if (colonIndex === -1) return this.findProviderForModel(modelId);
    const provider = modelId.substring(0, colonIndex);
    const model = modelId.substring(colonIndex + 1);
    return { provider, model };
  }

  /**
   * Find which provider handles a given model name (legacy support)
   */
  private findProviderForModel(model: string): { provider: string; model: string } {
    for (const [providerId, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (config.models.includes(model) && this.isConfigured(providerId)) {
        return { provider: providerId, model };
      }
    }
    return { provider: "zai", model: "zai-default" };
  }

  /**
   * Get the first available external provider with its default model
   * Used as fallback when ZAI SDK is not available
   */
  getFirstAvailableExternalProvider(): { providerId: string; model: string } | null {
    for (const [providerId, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (this.isConfigured(providerId)) {
        return { providerId, model: config.models[0] };
      }
    }
    return null;
  }

  /**
   * Get provider status (without exposing API keys)
   */
  getProviderStatus(): Array<{
    id: string;
    name: string;
    configured: boolean;
    modelCount: number;
    supportsVision: boolean;
  }> {
    const status: Array<{
      id: string;
      name: string;
      configured: boolean;
      modelCount: number;
      supportsVision: boolean;
    }> = [];
    status.push({
      id: "zai",
      name: ZAI_PROVIDER.name,
      configured: true,
      modelCount: ZAI_PROVIDER.models.length,
      supportsVision: ZAI_PROVIDER.supportsVision,
    });
    for (const [id, config] of Object.entries(PROVIDER_CONFIGS)) {
      status.push({
        id,
        name: config.name,
        configured: this.isConfigured(id),
        modelCount: config.models.length,
        supportsVision: config.supportsVision,
      });
    }
    return status;
  }
}

// Singleton
export const providerRegistry = new ProviderRegistry();
