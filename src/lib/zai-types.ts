/**
 * Type helpers for the ZAI (Z-AI) SDK.
 *
 * The ZAI SDK's TypeScript declarations don't include the `createVision`
 * method or the full message type variants used for multimodal/vision calls.
 * Instead of scattering `as unknown as` casts throughout the AI routes,
 * we define focused interfaces here.
 */

/** Shape returned by ZAI chat completion calls (vision and text) */
export interface ZAICompletionResult {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
}

/** ZAI chat completions API with both standard and vision methods */
export interface ZAIChatCompletions {
  CREATE: (args: Record<string, unknown>) => Promise<ZAICompletionResult>;
  /** Vision API — not declared in SDK types but available at runtime */
  createVision: (args: Record<string, unknown>) => Promise<ZAICompletionResult>;
}

/**
 * Cast ZAI chat.completions to our typed interface.
 * The `createVision` method exists at runtime but isn't in the SDK types.
 */
export function asZAIChatCompletions(
  completions: Record<string, unknown>,
): ZAIChatCompletions {
  return completions as ZAIChatCompletions;
}
