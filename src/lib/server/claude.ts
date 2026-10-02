import { aiConfig } from "../../config/ai";
import type { ChatStreamEvent } from "../../types/chat";
import { ChatError, classifyUpstreamError } from "./errors";
import { SSEParser } from "./sse";
import type { CleanMessage } from "./validation";

export interface StreamClaudeOptions {
  apiKey: string;
  system: string;
  messages: CleanMessage[];
  signal?: AbortSignal;
  /** Overridable for tests. */
  apiUrl?: string;
  model?: string;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Open a streaming request to the Claude Messages API.
 * Resolves once Claude has accepted the request (so HTTP errors such as a bad
 * API key or rate limit are thrown here, before we start streaming to the
 * browser), then yields text/usage/done events as they arrive.
 */
export async function openClaudeStream(
  opts: StreamClaudeOptions,
): Promise<AsyncGenerator<ChatStreamEvent, void, void>> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeout = AbortSignal.timeout(aiConfig.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetchImpl(opts.apiUrl ?? aiConfig.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": aiConfig.apiVersion,
      },
      body: JSON.stringify({
        model: opts.model ?? aiConfig.model,
        max_tokens: opts.maxTokens ?? aiConfig.maxTokens,
        system: opts.system,
        messages: opts.messages,
        stream: true,
      }),
      signal,
    });
  } catch (err) {
    if (timeout.aborted) throw new ChatError("timeout", "upstream timed out before responding");
    if (opts.signal?.aborted) throw err; // client went away — let caller handle quietly
    throw new ChatError("network", `fetch failed: ${(err as Error).message}`);
  }

  if (!res.ok || !res.body) {
    let type: string | undefined;
    let message: string | undefined;
    try {
      const json = (await res.json()) as { error?: { type?: string; message?: string } };
      type = json.error?.type;
      message = json.error?.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ChatError(
      classifyUpstreamError(res.status, type, message),
      `upstream ${res.status} ${type ?? ""} ${message ?? ""}`.trim(),
    );
  }

  return readEvents(res.body, timeout);
}

async function* readEvents(
  body: ReadableStream<Uint8Array>,
  timeout: AbortSignal,
): AsyncGenerator<ChatStreamEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: string | null = null;
  let finished = false;

  const handle = function* (data: string): Generator<ChatStreamEvent> {
    let evt: Record<string, any>;
    try {
      evt = JSON.parse(data);
    } catch {
      return; // ignore malformed lines
    }
    switch (evt.type) {
      case "message_start":
        inputTokens = evt.message?.usage?.input_tokens ?? 0;
        outputTokens = evt.message?.usage?.output_tokens ?? 0;
        break;
      case "content_block_delta":
        if (evt.delta?.type === "text_delta" && evt.delta.text) {
          yield { type: "text", text: evt.delta.text as string };
        }
        break;
      case "message_delta":
        // Usage in message_delta is cumulative.
        if (typeof evt.usage?.output_tokens === "number") outputTokens = evt.usage.output_tokens;
        if (typeof evt.usage?.input_tokens === "number") inputTokens = evt.usage.input_tokens;
        stopReason = evt.delta?.stop_reason ?? stopReason;
        break;
      case "message_stop":
        finished = true;
        break;
      case "error": {
        const code = classifyUpstreamError(0, evt.error?.type, evt.error?.message);
        throw new ChatError(code, `stream error ${evt.error?.type}: ${evt.error?.message}`);
      }
      default:
        break; // ping, content_block_start/stop, and future event types
    }
  };

  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (timeout.aborted) throw new ChatError("timeout", "upstream timed out mid-stream");
        throw err;
      }
      if (chunk.done) break;
      for (const e of parser.push(decoder.decode(chunk.value, { stream: true }))) {
        yield* handle(e.data);
      }
    }
    for (const e of parser.flush()) yield* handle(e.data);
  } finally {
    reader.releaseLock();
  }

  if (!finished) throw new ChatError("network", "stream ended before message_stop");

  yield { type: "usage", inputTokens, outputTokens };
  yield { type: "done", stopReason };
}
