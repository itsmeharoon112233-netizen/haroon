import type { ChatStreamEvent } from "../../types/chat";
import { ChatError } from "./errors";
import { SSEParser } from "./sse";
import type { CleanMessage } from "./validation";

/**
 * OpenAI (ChatGPT) provider — used automatically when the configured API key
 * is an OpenAI key (starts with "sk-" but not "sk-ant-"). Produces the same
 * events as the Claude provider, so the rest of the app doesn't change.
 */
export const openaiConfig = {
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini",
  apiUrl: "https://api.openai.com/v1/chat/completions",
  // Reasoning models count thinking toward this limit, so keep it generous.
  maxCompletionTokens: 6000,
  timeoutMs: 115_000,
} as const;

/** Google Gemini (AI Studio keys) via Google's OpenAI-compatible endpoint. Has a free tier. */
export const geminiConfig = {
  model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
  apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  maxTokens: 4000,
} as const;

/** xAI (Grok) speaks the same chat-completions format. Used for keys starting "xai-". */
export const xaiConfig = {
  model: process.env.XAI_MODEL?.trim() || "grok-4-fast",
  apiUrl: "https://api.x.ai/v1/chat/completions",
  maxTokens: 4000,
} as const;

export interface StreamOpenAIOptions {
  apiKey: string;
  system: string;
  messages: CleanMessage[];
  signal?: AbortSignal;
  apiUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** "openai" (default), "xai" for Grok, or "gemini" for Google. */
  vendor?: "openai" | "xai" | "gemini";
}

export function classifyOpenAIError(status: number, code?: string, message?: string) {
  const msg = (message ?? "").toLowerCase();
  if (status === 401 || status === 403 || code === "invalid_api_key") return "invalid_api_key" as const;
  if (msg.includes("api key not valid") || msg.includes("api_key_invalid") || msg.includes("invalid api key")) {
    return "invalid_api_key" as const;
  }
  // No credit left on the OpenAI account: a setup problem for the site owner.
  if (code === "insufficient_quota" || code === "credit_balance_exhausted" || msg.includes("quota") || msg.includes("credit")) {
    return "invalid_api_key" as const;
  }
  if (status === 429) return "rate_limited" as const;
  if (code === "context_length_exceeded" || msg.includes("maximum context length")) return "too_long" as const;
  if (status === 400) return "bad_request" as const;
  if (status === 503 || status === 529) return "overloaded" as const;
  if (status === 504) return "timeout" as const;
  return "server" as const;
}

export async function openOpenAIStream(
  opts: StreamOpenAIOptions,
): Promise<AsyncGenerator<ChatStreamEvent, void, void>> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeout = AbortSignal.timeout(openaiConfig.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  const vendor = opts.vendor ?? "openai";
  const other = vendor === "xai" ? xaiConfig : vendor === "gemini" ? geminiConfig : null;
  const model = opts.model ?? (other ? other.model : openaiConfig.model);
  const isReasoningModel = !other && /^(gpt-5|gpt-6|o\d)/.test(model);
  const body = other
    ? {
        model,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
        max_tokens: other.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }
    : {
        model,
        messages: [{ role: isReasoningModel ? "developer" : "system", content: opts.system }, ...opts.messages],
        max_completion_tokens: openaiConfig.maxCompletionTokens,
        ...(isReasoningModel ? { reasoning_effort: "low" } : {}),
        stream: true,
        stream_options: { include_usage: true },
      };

  let res: Response;
  try {
    res = await fetchImpl(opts.apiUrl ?? (other ? other.apiUrl : openaiConfig.apiUrl), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (timeout.aborted) throw new ChatError("timeout", "openai timed out before responding");
    if (opts.signal?.aborted) throw err;
    throw new ChatError("network", `openai fetch failed: ${(err as Error).message}`);
  }

  if (!res.ok || !res.body) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const raw = (await res.json()) as unknown;
      // Gemini sometimes wraps the error in an array.
      const json = (Array.isArray(raw) ? raw[0] : raw) as { error?: { code?: string | number; type?: string; status?: string; message?: string } };
      code = String(json.error?.status ?? json.error?.type ?? json.error?.code ?? "");
      message = json.error?.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ChatError(
      classifyOpenAIError(res.status, code, message),
      `${vendor} ${res.status} ${code ?? ""} ${message ?? ""}`.trim(),
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
    if (data.trim() === "[DONE]") {
      finished = true;
      return;
    }
    let evt: Record<string, any>;
    try {
      evt = JSON.parse(data);
    } catch {
      return;
    }
    if (evt.error) {
      throw new ChatError(
        classifyOpenAIError(0, evt.error.code ?? evt.error.type, evt.error.message),
        `openai stream error: ${evt.error.message}`,
      );
    }
    const choice = evt.choices?.[0];
    const text = choice?.delta?.content;
    if (typeof text === "string" && text) yield { type: "text", text };
    if (choice?.finish_reason) stopReason = choice.finish_reason;
    if (evt.usage) {
      inputTokens = evt.usage.prompt_tokens ?? inputTokens;
      outputTokens = evt.usage.completion_tokens ?? outputTokens;
    }
  };

  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (timeout.aborted) throw new ChatError("timeout", "openai timed out mid-stream");
        throw err;
      }
      if (chunk.done) break;
      for (const e of parser.push(decoder.decode(chunk.value, { stream: true }))) yield* handle(e.data);
    }
    for (const e of parser.flush()) yield* handle(e.data);
  } finally {
    reader.releaseLock();
  }

  if (!finished) throw new ChatError("network", "openai stream ended before [DONE]");
  yield { type: "usage", inputTokens, outputTokens };
  yield { type: "done", stopReason };
}
