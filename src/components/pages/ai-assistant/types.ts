// Shared types for AI Assistant components

// Web Speech API types (not yet in standard TypeScript lib)
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
export interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
export interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
export interface SpeechRecognitionAlternative {
  transcript: string;
}
export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

export interface Props {
  language: "ar" | "en";
  projectId?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
  tokensUsed?: number;
}

export interface ConversationMeta {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

export const CONVERSATIONS_KEY = "blueprint-ai-conversations";
