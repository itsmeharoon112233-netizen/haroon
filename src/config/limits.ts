/** Limits shared by the browser (for instant feedback) and the server (for enforcement). */
export const LIMITS = {
  /** Max characters in a single message typed by the user. */
  maxMessageChars: 8_000,
  /** Max messages accepted in one request. Older ones are trimmed first. */
  maxMessages: 60,
  /** Approximate character budget for the whole conversation sent to Claude. */
  maxContextChars: 60_000,
} as const;
