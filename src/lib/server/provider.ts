/**
 * Picks the AI provider from the configured key, so the site owner only has
 * to paste one key. Claude keys start with "sk-ant-", Grok (xAI) keys with "xai-",
 * OpenAI keys with "sk-". Any of ANTHROPIC_API_KEY, OPENAI_API_KEY or XAI_API_KEY works.
 */
export type Provider = "claude" | "openai" | "xai";

export function getConfiguredKey(): string {
  return (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.XAI_API_KEY || "").trim();
}

export function providerForKey(key: string): Provider {
  if (key.startsWith("sk-ant-")) return "claude";
  if (key.startsWith("xai-")) return "xai";
  if (key.startsWith("sk-")) return "openai";
  return "claude";
}

/** Which company a key comes from, judged only by its public prefix (for logs). */
export function describeKey(key: string): string {
  if (key.startsWith("sk-ant-")) return "Claude (Anthropic)";
  if (key.startsWith("xai-")) return "Grok (xAI)";
  if (key.startsWith("gsk_")) return "Groq (not Grok)";
  if (key.startsWith("AIza")) return "Google Gemini";
  if (key.startsWith("sk-or-")) return "OpenRouter";
  if (key.startsWith("sk-")) return "OpenAI";
  return "unknown type";
}
