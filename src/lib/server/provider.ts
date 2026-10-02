/**
 * Picks the AI provider from the configured key, so the site owner only has
 * to paste one key. Claude keys start with "sk-ant-"; OpenAI keys with "sk-".
 * Either env var name works: ANTHROPIC_API_KEY or OPENAI_API_KEY.
 */
export type Provider = "claude" | "openai";

export function getConfiguredKey(): string {
  return (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

export function providerForKey(key: string): Provider {
  return key.startsWith("sk-ant-") ? "claude" : key.startsWith("sk-") ? "openai" : "claude";
}
