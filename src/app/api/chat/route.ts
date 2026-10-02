import { createChatHandler } from "@/lib/server/chat-handler";

// Node.js runtime with full streaming support. Long answers can take a while,
// so allow up to 2 minutes (within Vercel limits on all plans with Fluid compute).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const POST = createChatHandler();
