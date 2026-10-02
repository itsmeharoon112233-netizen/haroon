// GET /api/status — tells the embed script whether the chat is ready.
// "Ready" means an API key is set AND the AI provider accepts it, so a wrong key
// keeps the chat button hidden on your website instead of showing visitors an error.
// Reveals only a yes/no, never the key itself.
import { aiConfig } from "@/config/ai";
import { getConfiguredKey, providerForKey } from "@/lib/server/provider";
import { classifyOpenAIError, openaiConfig } from "@/lib/server/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: { key: string; ready: boolean; at: number } | null = null;
// Re-check a working key hourly (keeps the test cost to pennies a month);
// re-check a failing one every 5 minutes so the button appears soon after it's fixed.
const TTL_READY_MS = 60 * 60_000;
const TTL_NOT_READY_MS = 5 * 60_000;

async function keyWorks(apiKey: string): Promise<boolean> {
  const provider = providerForKey(apiKey);
  try {
    // Listing models is free and confirms the key is valid.
    const res =
      provider === "openai"
        ? await fetch("https://api.openai.com/v1/models", {
            headers: { authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(8_000),
          })
        : await fetch("https://api.anthropic.com/v1/models?limit=1", {
            headers: { "x-api-key": apiKey, "anthropic-version": aiConfig.apiVersion },
            signal: AbortSignal.timeout(8_000),
          });
    if (res.status === 401 || res.status === 403) {
      console.error(
        `[status] ${provider} rejected the API key (${res.status}) length=${apiKey.length} hasWhitespace=${/\s/.test(apiKey)}`,
      );
      return false;
    }
    if (provider === "openai") {
      // A valid OpenAI key can still have no credit. Send a tiny test request
      // (costs a tiny fraction of a cent; at most hourly once the key works).
      const test = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: openaiConfig.model,
          messages: [{ role: "user", content: "ok" }],
          max_completion_tokens: 32,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!test.ok) {
        const body = (await test.json().catch(() => ({}))) as { error?: { code?: string; type?: string; message?: string } };
        const code = classifyOpenAIError(test.status, body.error?.code ?? body.error?.type, body.error?.message);
        if (code === "invalid_api_key") {
          console.error(`[status] openai account not usable: ${test.status} ${body.error?.code ?? ""} ${body.error?.message ?? ""}`);
          return false;
        }
      }
    }
    // Other errors (rate limits, outages) are temporary: don't hide the button for them.
    return true;
  } catch {
    return true;
  }
}

export async function GET() {
  const apiKey = getConfiguredKey();
  let ready = false;
  if (apiKey) {
    if (cache && cache.key === apiKey && Date.now() - cache.at < (cache.ready ? TTL_READY_MS : TTL_NOT_READY_MS)) {
      ready = cache.ready;
    } else {
      ready = await keyWorks(apiKey);
      cache = { key: apiKey, ready, at: Date.now() };
    }
  }
  return Response.json(
    { ready },
    { headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } },
  );
}
