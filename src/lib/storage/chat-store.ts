import type { Conversation } from "../../types/chat";

/**
 * Storage abstraction for chat history.
 *
 * v1 keeps history in the visitor's browser (localStorage): no accounts,
 * no database, private to each device. To move to a database later,
 * implement this interface against your API (e.g. Supabase/Postgres via
 * /api/conversations) and swap it in `getChatStore()` — the UI won't change.
 */
export interface ChatStore {
  load(): Conversation[];
  save(conversations: Conversation[]): void;
}

const KEY = "xpert.conversations.v1";
/** Keep localStorage well under the ~5 MB browser quota. */
const MAX_CONVERSATIONS = 100;

export class LocalChatStore implements ChatStore {
  load(): Conversation[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isConversation).map((c) => ({
        ...c,
        // A reply that was streaming when the tab closed is no longer streaming.
        messages: c.messages.map((m) => (m.status === "streaming" ? { ...m, status: "stopped" as const } : m)),
      }));
    } catch {
      return [];
    }
  }

  save(conversations: Conversation[]): void {
    const list = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // Quota exceeded: drop the oldest half and try once more.
      try {
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, Math.ceil(list.length / 2))));
      } catch {
        /* storage unavailable (private mode) — history just won't persist */
      }
    }
  }
}

function isConversation(c: unknown): c is Conversation {
  if (!c || typeof c !== "object") return false;
  const x = c as Conversation;
  return typeof x.id === "string" && typeof x.title === "string" && Array.isArray(x.messages);
}

let store: ChatStore | null = null;
export function getChatStore(): ChatStore {
  store ??= new LocalChatStore();
  return store;
}
