// GET /api/status — tells the embed script whether the chat is ready.
// Reveals only a yes/no, never the key itself.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const ready = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  return Response.json(
    { ready },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    },
  );
}
