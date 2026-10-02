import { LIMITS } from "../../config/limits";
import type { Role } from "../../types/chat";
import { ChatError } from "./errors";

export interface CleanMessage {
  role: Role;
  content: string;
}

/**
 * Validate and normalise the conversation sent by the browser:
 * - only "user"/"assistant" roles with non-empty string content
 * - consecutive messages from the same role are merged (Claude requires alternation)
 * - must start and end with a user message
 * - older messages are trimmed to stay inside the context budget
 */
export function validateMessages(input: unknown): CleanMessage[] {
  if (!input || typeof input !== "object" || !Array.isArray((input as { messages?: unknown }).messages)) {
    throw new ChatError("bad_request", "body.messages is not an array");
  }
  const raw = (input as { messages: unknown[] }).messages;
  if (raw.length === 0) throw new ChatError("bad_request", "no messages");

  const merged: CleanMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new ChatError("bad_request", "message is not an object");
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") throw new ChatError("bad_request", `bad role ${String(role)}`);
    if (typeof content !== "string") throw new ChatError("bad_request", "content is not a string");
    const text = content.trim();
    if (!text) continue; // skip empty messages (e.g. a stopped reply with no text)
    const last = merged[merged.length - 1];
    if (last && last.role === role) last.content += `\n\n${text}`;
    else merged.push({ role, content: text });
  }

  // Drop leading assistant messages; Claude conversations start with the user.
  while (merged.length && merged[0].role !== "user") merged.shift();
  if (merged.length === 0) throw new ChatError("bad_request", "no user message");

  const last = merged[merged.length - 1];
  if (last.role !== "user") throw new ChatError("bad_request", "last message must be from the user");
  if (last.content.length > LIMITS.maxMessageChars) {
    throw new ChatError("too_long", `last message ${last.content.length} chars`);
  }

  return trimContext(merged);
}

/** Keep the most recent messages that fit in the budget, starting on a user turn. */
export function trimContext(messages: CleanMessage[]): CleanMessage[] {
  const kept: CleanMessage[] = [];
  let chars = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (kept.length >= LIMITS.maxMessages) break;
    if (chars + m.content.length > LIMITS.maxContextChars && kept.length > 0) break;
    kept.unshift(m);
    chars += m.content.length;
  }
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return kept;
}
