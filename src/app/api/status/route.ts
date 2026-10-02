// GET /api/status — tells the embed script whether the chat is ready.
// "Ready" means an API key is set AND Claude accepts it, so a wrong key keeps
// the chat button hidden on your website instead of showing visitors an error.
// Reveals only a yes/no, never the key itself.
import { aiConfig } from "@/config/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: { key: string; ready: boolean; at: number } | null = null;
const TTL_MS = 5 * 60_000;

async function keyWorks(apiKey: string): Promise<boolean> {
  try {
    // Listing models is free and confirms the key is valid.
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": apiKey, "anthropic-version": aiConfig.apiVersion },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 401 || res.status === 403) {
      console.error(`[status] Claude rejected the API key (${res.status})`);
      return false;
    }
    // Other errors (rate limits, outages) are temporary: don't hide the button for them.
    return true;
  } catch {
    return true;
  }
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  let ready = false;
  if (apiKey) {
    if (cache && cache.key === apiKey && Date.now() - cache.at < TTL_MS) {
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
