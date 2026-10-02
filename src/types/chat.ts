export type Role = "user" | "assistant";

export type MessageStatus = "done" | "streaming" | "error" | "stopped";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  status?: MessageStatus;
  /** Friendly error text when status === "error". */
  error?: string;
  usage?: Usage;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** What the browser sends to /api/chat. */
export interface ChatRequestBody {
  messages: { role: Role; content: string }[];
}

/**
 * Events streamed from /api/chat to the browser, one JSON object per line
 * (newline-delimited JSON).
 */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "error"; code: ErrorCode; message: string }
  | { type: "done"; stopReason: string | null };

export type ErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "overloaded"
  | "bad_request"
  | "too_long"
  | "timeout"
  | "network"
  | "server";

export interface LeadRequestBody {
  name: string;
  phone: string;
  email?: string;
  interest: string;
  message?: string;
  conversationSummary?: string;
}
