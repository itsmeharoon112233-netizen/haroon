import { FRIENDLY_CLIENT_ERRORS } from "./client-errors";
import type { ChatStreamEvent, Role, Usage } from "../types/chat";

export interface StreamChatCallbacks {
  onText: (text: string) => void;
  onUsage?: (usage: Usage) => void;
}

export class ChatRequestError extends Error {
  constructor(message: string, public readonly retryable = true) {
    super(message);
    this.name = "ChatRequestError";
  }
}

/**
 * Send the conversation to /api/chat and stream the reply.
 * Resolves when the reply is complete; rejects with ChatRequestError
 * (friendly message) on failure, or an AbortError if stopped.
 */
export async function streamChat(
  messages: { role: Role; content: string }[],
  callbacks: StreamChatCallbacks,
  signal: AbortSignal,
  endpoint = "/api/chat",
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new ChatRequestError(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? FRIENDLY_CLIENT_ERRORS.offline
        : FRIENDLY_CLIENT_ERRORS.network,
    );
  }

  if (!res.ok || !res.body) {
    let message: string = FRIENDLY_CLIENT_ERRORS.server;
    let code = "";
    try {
      const json = (await res.json()) as { error?: { code?: string; message?: string } };
      message = json.error?.message || message;
      code = json.error?.code ?? "";
    } catch {
      /* not JSON (e.g. a platform timeout page) */
      if (res.status === 504) message = FRIENDLY_CLIENT_ERRORS.timeout;
    }
    const notRetryable = code === "too_long" || code === "missing_api_key" || code === "invalid_api_key";
    throw new ChatRequestError(message, !notRetryable);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let evt: ChatStreamEvent;
    try {
      evt = JSON.parse(line);
    } catch {
      return;
    }
    if (evt.type === "text") callbacks.onText(evt.text);
    else if (evt.type === "usage") callbacks.onUsage?.({ inputTokens: evt.inputTokens, outputTokens: evt.outputTokens });
    else if (evt.type === "error") throw new ChatRequestError(evt.message, evt.code !== "too_long");
    else if (evt.type === "done") done = true;
  };

  try {
    while (true) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        handleLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    handleLine(buffer + decoder.decode());
  } catch (err) {
    if (signal.aborted || err instanceof ChatRequestError) throw err;
    throw new ChatRequestError(FRIENDLY_CLIENT_ERRORS.interrupted);
  }

  if (!done) throw new ChatRequestError(FRIENDLY_CLIENT_ERRORS.interrupted);
}
