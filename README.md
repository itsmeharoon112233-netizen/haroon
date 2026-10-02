# Xpert AI by Ghandhara Estate

An AI real estate assistant for [ghandharaestate.com](https://ghandharaestate.com), powered by Claude.
Visitors ask about buying, selling or renting property in Islamabad and Rawalpindi, get clear streamed
answers, and can send an inquiry to your team with one click.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4.

---

## Quick start (local)

Requires **Node.js 20.9+**.

```bash
npm install
cp .env.example .env.local      # then put your Claude API key in .env.local
npm run dev                      # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build (also type-checks) |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Server tests against a mock Claude API (no key needed) |

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | One AI key: a Claude key (`sk-ant-…`, platform.claude.com) or an OpenAI key (`sk-…`). The app picks the provider from the key. Server-only. |
| `OPENAI_MODEL` | No | Model used with an OpenAI key, default `gpt-5.4-mini`. |
| `CLAUDE_MODEL` | No | Default `claude-sonnet-5-5`. Use `claude-haiku-4-5-20251001` for lower cost. |
| `CLAUDE_MAX_TOKENS` | No | Max reply length, default `2048`. |
| `LEAD_WEBHOOK_URL` | No | Where "Talk to an agent" inquiries are POSTed as JSON (n8n, Zapier, Make, Google Apps Script…). |
| `EMBED_ALLOWED_ORIGINS` | For the embed | Your existing site(s), space-separated: `https://ghandharaestate.com https://www.ghandharaestate.com` |
| `NEXT_PUBLIC_SITE_URL` | No | Where this app lives, for SEO links, e.g. `https://chat.ghandharaestate.com`. |

## Deploy to Vercel

1. Push this folder to a GitHub repository (`.env.local` is git-ignored — never commit it).
2. On vercel.com → **Add New → Project** → import the repo. Framework is detected as Next.js; keep the defaults.
3. In **Settings → Environment Variables**, add the variables above (at least `ANTHROPIC_API_KEY` and `EMBED_ALLOWED_ORIGINS`).
4. Deploy. Optional: in **Settings → Domains** add `chat.ghandharaestate.com` and create the CNAME record your DNS provider shows.
5. If you change `EMBED_ALLOWED_ORIGINS` later, redeploy (it is applied at build time).

## Add the chat to your WordPress site

Once deployed, paste this one line into your site's footer:

```html
<script src="https://YOUR-DEPLOYED-URL/embed.js" defer></script>
```

Easiest way on WordPress: install the free **WPCode** plugin → *Code Snippets → Header & Footer* → paste into **Footer** → Save.
A green "Chat with Xpert AI" button appears in the bottom corner of every page. The chat loads only when clicked,
so it doesn't slow your site down. Options: `data-label="Ask our AI"` and `data-position="left"` on the script tag.

You can also simply link to the app from your menu (e.g. "AI Assistant" → `https://chat.ghandharaestate.com`).

## Customising

| To change… | Edit |
|---|---|
| How the AI behaves, business facts, areas served | `src/config/ai.ts` (`SYSTEM_PROMPT`, `BUSINESS_INFO`) |
| Name, tagline, phone/WhatsApp/email, welcome prompts | `src/config/site.ts` |
| Message length / history limits | `src/config/limits.ts` |
| Colours (light & dark) | CSS variables at the top of `src/app/globals.css` |
| Logo | `src/components/brand/Logo.tsx` and `src/app/icon.svg` |

The assistant only states business facts that appear in `BUSINESS_INFO`. It has no live listing data, so it sends
people to your website listings or an agent for specific properties.

## Project structure

```
src/
  app/
    api/chat/route.ts     POST /api/chat → streams Claude's reply (NDJSON)
    api/lead/route.ts     POST /api/lead → forwards inquiries to your webhook
    layout.tsx            fonts, SEO metadata, theme bootstrapping
    page.tsx              the chat app
    robots.ts, sitemap.ts, icon.svg, opengraph-image.tsx
  components/
    chat/                 ChatApp, MessageList, MessageItem, Markdown, CodeBlock, Composer, WelcomeScreen, LeadDialog
    layout/               Sidebar (drawer on mobile), ChatHeader
    ui/                   Icons, Toast, Dialog
    theme/                ThemeProvider (light/dark)
  config/                 site.ts, ai.ts, limits.ts
  hooks/                  useChat (conversation state + streaming), useAutoScroll
  lib/
    server/               Claude client + SSE parser, validation, errors, rate limiting, handlers
    storage/chat-store.ts chat history storage (swap for a database here)
    chat-client.ts        browser side of the stream
  types/chat.ts
public/embed.js           drop-in chat button for other sites
tests/server.test.ts
```

## How it works

- The browser sends the conversation to `/api/chat`. The server validates it (empty / too-long messages,
  role order), trims old history to a budget, and calls the Claude Messages API with streaming.
- Claude's server-sent events are parsed on the server and re-streamed to the browser as one JSON object per line.
  Stopping a reply cancels the upstream Claude request too, so you don't pay for unused tokens.
- Errors (missing/invalid key, rate limits, overload, timeouts, cut-off streams) are mapped to friendly messages;
  details only go to the server log.
- A simple per-IP rate limit (20 messages/minute) protects your API key.

## Chat history

History is saved in each visitor's browser (localStorage): private, no sign-up, no database.
The `ChatStore` interface in `src/lib/storage/chat-store.ts` is the single place to change if you later
want accounts and server-side history (e.g. Supabase/Postgres + Auth.js).

## Known limitations

- History doesn't sync between devices (by design for v1; see above).
- Inside the embedded widget, some browsers (Safari) block storage for third-party iframes, so history may not persist there. Chatting still works.
- The rate limiter is per server instance; for strict limits use Vercel Firewall rules or Upstash Redis.
- The assistant doesn't search your live listings. A good next step is a small tool that reads your WordPress listings via the REST API so Xpert AI can suggest real properties.
