import { SYSTEM_PROMPT } from "../../config/ai";
import type { ChatStreamEvent, ErrorCode } from "../../types/chat";
import { openClaudeStream } from "./claude";
import { openOpenAIStream } from "./openai";
import { getConfiguredKey, providerForKey } from "./provider";
import { ChatError, ERROR_STATUS, FRIENDLY_ERRORS } from "./errors";
import { createRateLimiter, getClientIp } from "./rate-limit";
import { validateMessages } from "./validation";

export interface ChatHandlerOptions {
  getApiKey?: () => string | undefined;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  rateLimit?: { limit: number; windowMs: number };
  log?: (msg: string) => void;
}

/**
 * Build the POST handler for /api/chat. Written against the standard
 * Request/Response Web APIs so it can be unit-tested without Next.js.
 */
export function createChatHandler(options: ChatHandlerOptions = {}) {
  const getApiKey = options.getApiKey ?? getConfiguredKey;
  const log = options.log ?? ((msg: string) => console.error(`[chat] ${msg}`));
  const checkRate = createRateLimiter(options.rateLimit ?? { limit: 20, windowMs: 60_000 });

  return async function POST(request: Request): Promise<Response> {
    const rate = checkRate(getClientIp(request.headers));
    if (!rate.ok) {
      return errorResponse("rate_limited", { "retry-after": String(rate.retryAfterSeconds) });
    }

    let messages;
    try {
      messages = validateMessages(await request.json());
    } catch (err) {
      if (err instanceof ChatError) {
        log(`rejected request: ${err.detail}`);
        return errorResponse(err.code);
      }
      return errorResponse("bad_request");
    }

    const apiKey = getApiKey()?.trim();
    if (!apiKey) {
      log("No API key is set (ANTHROPIC_API_KEY, OPENAI_API_KEY or XAI_API_KEY)");
      return errorResponse("missing_api_key");
    }

    const upstreamAbort = new AbortController();
    request.signal?.addEventListener("abort", () => upstreamAbort.abort(), { once: true });

    let events: AsyncGenerator<ChatStreamEvent, void, void>;
    try {
      const streamOptions = {
        apiKey,
        system: SYSTEM_PROMPT,
        messages,
        signal: upstreamAbort.signal,
        apiUrl: options.apiUrl,
        fetchImpl: options.fetchImpl,
      };
      const provider = providerForKey(apiKey);
      events =
        provider === "claude"
          ? await openClaudeStream(streamOptions)
          : await openOpenAIStream({ ...streamOptions, vendor: provider });
    } catch (err) {
      if (upstreamAbort.signal.aborted && !(err instanceof ChatError)) {
        return new Response(null, { status: 499 });
      }
      const code: ErrorCode = err instanceof ChatError ? err.code : "server";
      log(`upstream error: ${err instanceof ChatError ? err.detail : (err as Error).message}`);
      return errorResponse(code);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (e: ChatStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        try {
          for await (const e of events) send(e);
        } catch (err) {
          if (!upstreamAbort.signal.aborted) {
            const code: ErrorCode = err instanceof ChatError ? err.code : "network";
            log(`stream error: ${err instanceof ChatError ? err.detail : (err as Error).message}`);
            send({ type: "error", code, message: FRIENDLY_ERRORS[code] });
          }
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed because the client disconnected */
          }
        }
      },
      cancel() {
        upstreamAbort.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  };
}

function errorResponse(code: ErrorCode, headers: Record<string, string> = {}) {
  return Response.json(
    { error: { code, message: FRIENDLY_ERRORS[code] } },
    { status: ERROR_STATUS[code], headers },
  );
}
