// ============================================================
// lib/rateLimit.js
//
// Per-endpoint rate limiter with an Upstash Redis backend when configured
// (durable across cold starts and Vercel edge/serverless), falling back to
// an in-memory bucket per instance when it isn't.
//
// Usage in an App Router handler:
//
//   import { rateLimit, keyFromRequest } from "@/lib/rateLimit";
//
//   export async function POST(req) {
//     const { ok, retryAfter } = await rateLimit({
//       key: keyFromRequest(req, "ai", userEmail),
//       max: 30, windowMs: 60 * 60 * 1000,
//     });
//     if (!ok) {
//       return Response.json(
//         { error: "Too many requests. Please slow down." },
//         { status: 429, headers: { "Retry-After": String(retryAfter) } },
//       );
//     }
//     // ...
//   }
//
// Env:
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — if both set, uses
//   Upstash. Otherwise falls back to per-instance in-memory bucket.
// ============================================================

const MEM = new Map();

function memLimit({ key, max, windowMs }) {
  const now = Date.now();
  const rec = MEM.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + windowMs;
  }
  rec.count += 1;
  MEM.set(key, rec);
  // Periodic sweep to avoid the map growing unbounded.
  if (MEM.size > 5000) {
    for (const [k, v] of MEM) if (now > v.resetAt) MEM.delete(k);
  }
  return {
    ok: rec.count <= max,
    remaining: Math.max(0, max - rec.count),
    resetAt: rec.resetAt,
    retryAfter: Math.max(0, Math.ceil((rec.resetAt - now) / 1000)),
  };
}

async function upstashLimit({ key, max, windowMs }) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const winSec = Math.max(1, Math.floor(windowMs / 1000));
  // Use a fixed-window key (per-window bucket). Simple, cheap, no scripts.
  const bucket = `rl:${key}:${Math.floor(nowSec / winSec)}`;
  try {
    // INCR then EXPIRE via pipeline. Upstash REST accepts an array of commands.
    const r = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", bucket],
        ["EXPIRE", bucket, String(winSec)],
      ]),
    });
    if (!r.ok) throw new Error(`upstash ${r.status}`);
    const arr = await r.json();
    const count = Number(arr?.[0]?.result ?? 0);
    const resetAt = (Math.floor(nowSec / winSec) + 1) * winSec * 1000;
    return {
      ok: count <= max,
      remaining: Math.max(0, max - count),
      resetAt,
      retryAfter: Math.max(0, Math.ceil((resetAt - now) / 1000)),
    };
  } catch (e) {
    console.error("[rateLimit] upstash failed, falling back to in-memory:", e && e.message);
    return memLimit({ key, max, windowMs });
  }
}

export async function rateLimit({ key, max, windowMs }) {
  if (!key || !max || !windowMs) {
    return { ok: true, remaining: max, resetAt: 0, retryAfter: 0 };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashLimit({ key, max, windowMs });
  }
  return memLimit({ key, max, windowMs });
}

/**
 * Build a stable rate-limit key from a request + optional user identity.
 * Prefers the authenticated email; falls back to first x-forwarded-for IP.
 */
export function keyFromRequest(req, route, userEmail) {
  if (userEmail) return `u:${String(userEmail).toLowerCase()}:${route}`;
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}:${route}`;
}
