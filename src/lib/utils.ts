import type { Conversation } from "../types/chat";

/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Conversation title from the first message: first line, max ~48 chars. */
export function makeTitle(text: string): string {
  const firstLine = text.replace(/\s+/g, " ").trim();
  if (firstLine.length <= 48) return firstLine || "New chat";
  const cut = firstLine.slice(0, 48);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 24 ? lastSpace : 48)}…`;
}

export interface ConversationGroup {
  label: string;
  items: Conversation[];
}

/** Group conversations for the sidebar: Today, Yesterday, Previous 7 days, Older. */
export function groupConversations(conversations: Conversation[], now = Date.now()): ConversationGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 86_400_000;
  const week = today - 7 * 86_400_000;

  const buckets: ConversationGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const c of sorted) {
    if (c.updatedAt >= today) buckets[0].items.push(c);
    else if (c.updatedAt >= yesterday) buckets[1].items.push(c);
    else if (c.updatedAt >= week) buckets[2].items.push(c);
    else buckets[3].items.push(c);
  }
  return buckets.filter((b) => b.items.length > 0);
}

/** Render a conversation as a Markdown document for export. */
export function conversationToMarkdown(c: Conversation, assistantName: string): string {
  const lines = [`# ${c.title}`, "", `_Exported ${formatDateTime(Date.now())}_`, ""];
  for (const m of c.messages) {
    if (!m.content.trim()) continue;
    const who = m.role === "user" ? "You" : assistantName;
    lines.push(`### ${who} · ${formatDateTime(m.createdAt)}`, "", m.content.trim(), "");
  }
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "conversation"
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
