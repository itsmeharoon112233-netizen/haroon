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
