import { ConversationMeta, CONVERSATIONS_KEY } from "./types";

// localStorage helpers for conversations
export function loadConversations(): ConversationMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CONVERSATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: ConversationMeta[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 50)));
  } catch {
    // localStorage might be full
  }
}
