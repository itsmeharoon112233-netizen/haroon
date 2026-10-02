import { createRateLimiter, getClientIp } from "./rate-limit";

export interface LeadHandlerOptions {
  getWebhookUrl?: () => string | undefined;
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
}

const MAX = { name: 100, phone: 30, email: 200, interest: 60, message: 2_000, summary: 4_000 };

/**
 * POST /api/lead — forwards a "Talk to an agent" inquiry to your webhook
 * (n8n, Zapier, Make, Google Apps Script…) as JSON.
 */
export function createLeadHandler(options: LeadHandlerOptions = {}) {
  const getWebhookUrl = options.getWebhookUrl ?? (() => process.env.LEAD_WEBHOOK_URL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const log = options.log ?? ((msg: string) => console.error(`[lead] ${msg}`));
  const checkRate = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

  return async function POST(request: Request): Promise<Response> {
    if (!checkRate(getClientIp(request.headers)).ok) {
      return fail(429, "Too many inquiries from this device. Please try again later or contact us directly.");
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail(400, "Invalid form data.");
    }

    const str = (key: string, max: number) =>
      typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";
    const lead = {
      name: str("name", MAX.name),
      phone: str("phone", MAX.phone),
      email: str("email", MAX.email),
      interest: str("interest", MAX.interest),
      message: str("message", MAX.message),
      conversationSummary: str("conversationSummary", MAX.summary),
      submittedAt: new Date().toISOString(),
      source: "Xpert AI website chat",
    };

    if (!lead.name) return fail(400, "Please enter your name.");
    if (!/^[+\d][\d\s()-]{6,}$/.test(lead.phone)) return fail(400, "Please enter a valid phone number.");
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      return fail(400, "Please enter a valid email address.");
    }

    const webhook = getWebhookUrl()?.trim();
    if (!webhook) {
      log("LEAD_WEBHOOK_URL is not set — inquiry not delivered");
      return fail(503, "Online inquiries aren't available right now. Please contact us using the details shown.");
    }

    try {
      const res = await fetchImpl(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`webhook responded ${res.status}`);
    } catch (err) {
      log(`webhook failed: ${(err as Error).message}`);
      return fail(502, "We couldn't send your inquiry. Please try again or contact us directly.");
    }

    return Response.json({ ok: true });
  };
}

function fail(status: number, message: string) {
  return Response.json({ ok: false, message }, { status });
}
