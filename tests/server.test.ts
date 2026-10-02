/**
 * Server tests: run with `npm test`.
 * They exercise the real /api/chat handler and Claude stream parser against a
 * mock Claude API (a local HTTP server speaking the Messages API SSE format),
 * so no API key or network access is needed.
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createChatHandler } from "../src/lib/server/chat-handler";
import { createLeadHandler } from "../src/lib/server/lead-handler";
import { SSEParser } from "../src/lib/server/sse";
import { validateMessages, trimContext } from "../src/lib/server/validation";
import { LIMITS } from "../src/config/limits";
import type { ChatStreamEvent } from "../src/types/chat";

// ---------- mock Claude API ----------

type Scenario = "ok" | "401" | "429" | "529" | "400long" | "midstream_error" | "truncated" | "slow";
let scenario: Scenario = "ok";
let lastBody: any = null;
let lastHeaders: http.IncomingHttpHeaders = {};
let upstreamClosedEarly = false;

function sse(event: string, data: object) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", async () => {
    lastBody = JSON.parse(raw);
    lastHeaders = req.headers;
    const err = (status: number, type: string, message: string) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ type: "error", error: { type, message } }));
    };
    if (scenario === "401") return err(401, "authentication_error", "invalid x-api-key sk-secret-123");
    if (scenario === "429") return err(429, "rate_limit_error", "Number of request tokens has exceeded your rate limit");
    if (scenario === "529") return err(529, "overloaded_error", "Overloaded");
    if (scenario === "400long") return err(400, "invalid_request_error", "prompt is too long: 250000 tokens > 200000 maximum");

    res.writeHead(200, { "content-type": "text/event-stream" });
    res.on("close", () => {
      if (!res.writableEnded) upstreamClosedEarly = true;
    });
    // Echo the last user message so tests can check context was forwarded.
    const lastUser = lastBody.messages.at(-1).content as string;
    const reply = `You said: ${lastUser}. Turns: ${lastBody.messages.length}.`;
    const full =
      sse("message_start", { type: "message_start", message: { usage: { input_tokens: 42, output_tokens: 1 } } }) +
      sse("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }) +
      sse("ping", { type: "ping" });
    // Write with CRLF line endings and awkward split points to stress the parser.
    const crlf = full.replace(/\n/g, "\r\n");
    for (let i = 0; i < crlf.length; i += 17) res.write(crlf.slice(i, i + 17));

    const words = reply.split(/(?<= )/);
    for (const w of words) {
      res.write(sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: w } }));
      await new Promise((r) => setTimeout(r, scenario === "slow" ? 40 : 2));
      if (res.destroyed) return;
    }
    if (scenario === "midstream_error") {
      res.end(sse("error", { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }));
      return;
    }
    if (scenario === "truncated") {
      res.destroy();
      return;
    }
    res.write(sse("content_block_stop", { type: "content_block_stop", index: 0 }));
    res.write(sse("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 17 } }));
    res.end(sse("message_stop", { type: "message_stop" }));
  });
});

let apiUrl = "";
before(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/messages`;
});
after(() => server.close());

// ---------- helpers ----------

const quietLogs: string[] = [];
function handler(opts: { key?: string; limit?: number } = {}) {
  return createChatHandler({
    getApiKey: () => ("key" in opts ? opts.key : "sk-ant-test-key"),
    apiUrl,
    rateLimit: { limit: opts.limit ?? 1000, windowMs: 60_000 },
    log: (m) => quietLogs.push(m),
  });
}

function chatRequest(messages: unknown, init: RequestInit = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify({ messages }),
    ...init,
  });
}

async function readNdjson(res: Response): Promise<ChatStreamEvent[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// ---------- tests ----------

describe("SSE parser", () => {
  it("handles events split across chunks and CRLF line endings", () => {
    const p = new SSEParser();
    const out = [
      ...p.push("event: a\r\nda"),
      ...p.push("ta: {\"x\":1}\r\n"),
      ...p.push("\r\n: comment\n\nevent: b\ndata: 2\n"),
      ...p.flush(),
    ];
    assert.deepEqual(out, [
      { event: "a", data: '{"x":1}' },
      { event: "b", data: "2" },
    ]);
  });
});

describe("message validation", () => {
  it("merges consecutive same-role messages and drops empty ones", () => {
    const out = validateMessages({
      messages: [
        { role: "assistant", content: "hello (orphan greeting)" },
        { role: "user", content: "first" },
        { role: "user", content: "second" },
        { role: "assistant", content: "  " },
      ],
    });
    assert.deepEqual(out, [{ role: "user", content: "first\n\nsecond" }]);
  });

  it("rejects bad shapes", () => {
    assert.throws(() => validateMessages({}), { name: "ChatError" });
    assert.throws(() => validateMessages({ messages: [{ role: "system", content: "x" }] }), { name: "ChatError" });
    assert.throws(() => validateMessages({ messages: [{ role: "user", content: "   " }] }), { name: "ChatError" });
  });

  it("trims old history to the context budget, starting on a user turn", () => {
    const big = "x".repeat(LIMITS.maxContextChars / 2);
    const msgs = [
      { role: "user" as const, content: big },
      { role: "assistant" as const, content: big },
      { role: "user" as const, content: "recent question" },
    ];
    const out = trimContext(msgs);
    assert.equal(out[0].role, "user");
    assert.equal(out.at(-1)!.content, "recent question");
    assert.ok(out.reduce((n, m) => n + m.content.length, 0) <= LIMITS.maxContextChars);
  });
});

describe("POST /api/chat", () => {
  it("streams Claude's reply as NDJSON with usage, and forwards context", async () => {
    scenario = "ok";
    const res = await handler()(
      chatRequest([
        { role: "user", content: "I want a 10 marla house" },
        { role: "assistant", content: "Great, which city?" },
        { role: "user", content: "Abbottabad" },
      ]),
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type")!, /ndjson/);
    const events = await readNdjson(res);
    const text = events.filter((e) => e.type === "text").map((e: any) => e.text).join("");
    assert.equal(text, "You said: Abbottabad. Turns: 3.");
    assert.ok(events.filter((e) => e.type === "text").length > 3, "should arrive in multiple chunks");
    assert.deepEqual(events.at(-2), { type: "usage", inputTokens: 42, outputTokens: 17 });
    assert.deepEqual(events.at(-1), { type: "done", stopReason: "end_turn" });

    // Upstream request was well-formed.
    assert.equal(lastHeaders["x-api-key"], "sk-ant-test-key");
    assert.equal(lastHeaders["anthropic-version"], "2023-06-01");
    assert.equal(lastBody.stream, true);
    assert.equal(lastBody.messages.length, 3);
    assert.match(lastBody.system, /Ghandhara Estate/);
  });

  it("returns a friendly error when the API key is missing", async () => {
    const res = await handler({ key: undefined })(chatRequest([{ role: "user", content: "hi" }]));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, "missing_api_key");
  });

  for (const [s, status, code] of [
    ["401", 503, "invalid_api_key"],
    ["429", 429, "rate_limited"],
    ["529", 503, "overloaded"],
    ["400long", 413, "too_long"],
  ] as const) {
    it(`maps upstream ${s} to ${code} without leaking details`, async () => {
      scenario = s;
      const res = await handler()(chatRequest([{ role: "user", content: "hi" }]));
      assert.equal(res.status, status);
      const raw = await res.text();
      assert.equal(JSON.parse(raw).error.code, code);
      assert.doesNotMatch(raw, /sk-|x-api-key|tokens >/i, "must not leak upstream detail");
    });
  }

  it("emits an error event when Claude fails mid-stream, keeping partial text", async () => {
    scenario = "midstream_error";
    const events = await readNdjson(await handler()(chatRequest([{ role: "user", content: "hi" }])));
    assert.ok(events.some((e) => e.type === "text"));
    const last = events.at(-1)!;
    assert.equal(last.type, "error");
    assert.equal((last as any).code, "overloaded");
  });

  it("emits a network error when the stream is cut off", async () => {
    scenario = "truncated";
    const events = await readNdjson(await handler()(chatRequest([{ role: "user", content: "hi" }])));
    assert.equal(events.at(-1)!.type, "error");
  });

  it("rejects empty and over-long messages", async () => {
    scenario = "ok";
    const empty = await handler()(chatRequest([{ role: "user", content: "   " }]));
    assert.equal(empty.status, 400);
    const long = await handler()(chatRequest([{ role: "user", content: "a".repeat(LIMITS.maxMessageChars + 1) }]));
    assert.equal(long.status, 413);
    const junk = await handler()(new Request("http://localhost/api/chat", { method: "POST", body: "not json" }));
    assert.equal(junk.status, 400);
  });

  it("rate-limits per IP", async () => {
    scenario = "ok";
    const h = handler({ limit: 2 });
    await (await h(chatRequest([{ role: "user", content: "1" }]))).text();
    await (await h(chatRequest([{ role: "user", content: "2" }]))).text();
    const third = await h(chatRequest([{ role: "user", content: "3" }]));
    assert.equal(third.status, 429);
    assert.ok(Number(third.headers.get("retry-after")) > 0);
  });

  it("stops the upstream request when the browser cancels (Stop button)", async () => {
    scenario = "slow";
    upstreamClosedEarly = false;
    const res = await handler()(chatRequest([{ role: "user", content: "a long question with many words in it" }]));
    const reader = res.body!.getReader();
    await reader.read(); // first chunk arrives
    await reader.cancel();
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(upstreamClosedEarly, true, "upstream connection should be closed");
  });
});

describe("POST /api/lead", () => {
  const req = (body: object) =>
    new Request("http://localhost/api/lead", {
      method: "POST",
      headers: { "x-forwarded-for": "5.6.7.8" },
      body: JSON.stringify(body),
    });

  it("validates and forwards inquiries to the webhook", async () => {
    let forwarded: any = null;
    const h = createLeadHandler({
      getWebhookUrl: () => "https://example.test/hook",
      fetchImpl: (async (_url: string, init: RequestInit) => {
        forwarded = JSON.parse(init.body as string);
        return new Response("ok");
      }) as typeof fetch,
      log: () => {},
    });
    assert.equal((await h(req({ name: "", phone: "0300" }))).status, 400);
    const ok = await h(req({ name: "Ali", phone: "+92 300 1234567", interest: "Buying" }));
    assert.equal(ok.status, 200);
    assert.equal(forwarded.name, "Ali");
    assert.equal(forwarded.interest, "Buying");
  });

  it("reports when no webhook is configured", async () => {
    const h = createLeadHandler({ getWebhookUrl: () => "", log: () => {} });
    const res = await h(req({ name: "Ali", phone: "+92 300 1234567", interest: "Buying" }));
    assert.equal(res.status, 503);
  });
});

describe("OpenAI provider (sk- keys)", () => {
  const sseBody = (chunks: string[]) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        const enc = new TextEncoder();
        for (const ch of chunks) c.enqueue(enc.encode(ch));
        c.close();
      },
    });

  it("streams ChatGPT replies through the same NDJSON format", async () => {
    let sent: any = null;
    let auth = "";
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(init.body as string);
      auth = (init.headers as Record<string, string>).authorization;
      const ev = (o: object) => `data: ${JSON.stringify(o)}\n\n`;
      return new Response(
        sseBody([
          ev({ choices: [{ delta: { role: "assistant", content: "" } }] }),
          ev({ choices: [{ delta: { content: "Salaam! " } }] }),
          ev({ choices: [{ delta: { content: "Plots in G-10…" }, finish_reason: "stop" }] }),
          ev({ choices: [], usage: { prompt_tokens: 50, completion_tokens: 9 } }),
          "data: [DONE]\n\n",
        ]),
        { headers: { "content-type": "text/event-stream" } },
      );
    }) as typeof fetch;
    const h = createChatHandler({ getApiKey: () => "sk-proj-abc", fetchImpl, log: () => {} });
    const events = await readNdjson(await h(chatRequest([{ role: "user", content: "plots?" }])));
    assert.equal(events.filter((e) => e.type === "text").map((e: any) => e.text).join(""), "Salaam! Plots in G-10…");
    assert.deepEqual(events.at(-2), { type: "usage", inputTokens: 50, outputTokens: 9 });
    assert.equal(auth, "Bearer sk-proj-abc");
    assert.match(sent.messages[0].content, /Ghandhara Estate/);
    assert.equal(sent.messages.at(-1).content, "plots?");
  });

  it("maps no-credit and bad-key errors to friendly messages", async () => {
    for (const [status, code, want] of [
      [429, "insufficient_quota", "invalid_api_key"],
      [401, "invalid_api_key", "invalid_api_key"],
      [429, "rate_limit_exceeded", "rate_limited"],
    ] as const) {
      const fetchImpl = (async () =>
        Response.json({ error: { code, message: "x" } }, { status })) as unknown as typeof fetch;
      const h = createChatHandler({ getApiKey: () => "sk-proj-abc", fetchImpl, log: () => {} });
      const res = await h(chatRequest([{ role: "user", content: "hi" }]));
      assert.equal((await res.json()).error.code, want);
    }
  });
});
