export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface VisionContentPart {
  type: 'text' | 'image_url' | 'file_url';
  text?: string;
  image_url?: { url: string };
  file_url?: { url: string };
}

export interface VisionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | VisionContentPart[];
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ProviderConfig {
  name: string;
  provider: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  models: string[];
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export interface AIProvider {
  chat(messages: ChatMessage[], options: ChatOptions): Promise<string>;
  chatStream?(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string, void, unknown>;
  chatWithVision?(messages: VisionMessage[], options: ChatOptions): Promise<string>;
}
