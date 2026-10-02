import type { ErrorCode } from "../../types/chat";

/** User-facing messages. Never include secrets or raw upstream details. */
export const FRIENDLY_ERRORS: Record<ErrorCode, string> = {
  missing_api_key:
    "Xpert AI isn't set up yet — the site owner needs to add the Claude API key. Please try again later.",
  invalid_api_key:
    "Xpert AI can't connect to its AI service right now because of a configuration problem. Please try again later.",
  rate_limited: "Lots of people are chatting right now. Please wait a moment and try again.",
  overloaded: "The AI service is busy at the moment. Please try again in a few seconds.",
  bad_request: "That message couldn't be processed. Try rephrasing it or starting a new chat.",
  too_long:
    "This conversation has become too long. Start a new chat, or send a shorter message.",
  timeout: "The response took too long. Please try again.",
  network: "Couldn't reach the AI service. Check your connection and try again.",
  server: "Something went wrong on our side. Please try again.",
};

/** HTTP status the API route should return for each error. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  missing_api_key: 503,
  invalid_api_key: 503,
  rate_limited: 429,
  overloaded: 503,
  bad_request: 400,
  too_long: 413,
  timeout: 504,
  network: 502,
  server: 500,
};

export class ChatError extends Error {
  constructor(
    public readonly code: ErrorCode,
    /** Internal detail for server logs only — never sent to the browser. */
    public readonly detail?: string,
  ) {
    super(FRIENDLY_ERRORS[code]);
    this.name = "ChatError";
  }
}

/** Map an Anthropic API error (HTTP status + error.type) to our error code. */
export function classifyUpstreamError(status: number, type?: string, message?: string): ErrorCode {
  const msg = (message ?? "").toLowerCase();
  if (status === 401 || type === "authentication_error") return "invalid_api_key";
  if (status === 403 || type === "permission_error") return "invalid_api_key";
  if (status === 429 || type === "rate_limit_error") return "rate_limited";
  if (status === 529 || type === "overloaded_error") return "overloaded";
  if (status === 413 || type === "request_too_large") return "too_long";
  if (status === 400 || type === "invalid_request_error") {
    if (msg.includes("too long") || msg.includes("context") || msg.includes("too many tokens")) {
      return "too_long";
    }
    return "bad_request";
  }
  if (status === 504 || type === "timeout_error") return "timeout";
  return "server";
}
