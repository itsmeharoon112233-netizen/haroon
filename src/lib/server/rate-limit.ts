/**
 * Small in-memory sliding-window rate limiter, keyed by client IP.
 *
 * Good enough to stop casual abuse of your API key. On serverless hosts
 * (Vercel) each instance has its own memory, so limits are per-instance.
 * For strict limits across instances, swap this for Upstash Redis or
 * Vercel's firewall rate limiting — the interface stays the same.
 */
export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= limit) {
      hits.set(key, recent);
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      return { ok: false, retryAfterSeconds };
    }

    recent.push(now);
    hits.set(key, recent);

    // Occasional cleanup so the map can't grow without bound.
    if (hits.size > 5_000) {
      for (const [k, times] of hits) {
        if (times.every((t) => t <= windowStart)) hits.delete(k);
      }
    }
    return { ok: true, retryAfterSeconds: 0 };
  };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
