// ============================================================
// ChaiRaise AI API Route — server-side proxy for Anthropic/Perplexity
// API keys are ONLY on the server — never exposed to the client
// ============================================================
import { auth } from "@/lib/auth";
import { rateLimit, keyFromRequest } from "@/lib/rateLimit";
import { logEvent, EVENTS } from "@/lib/track";
import {
  ALLOWED_PROVIDERS, MAX_PROMPT_CHARS, clampMaxTokens, resolveAnthropicModel,
} from "@/lib/aiGuards";

export async function POST(request) {
  try {
    // Require authentication for AI calls
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 30 AI calls per authenticated user per hour. Anthropic +
    // Perplexity bills are the biggest cost-of-abuse target here; a signed-in
    // user who loops this endpoint at max_tokens can burn through credits
    // fast. 30/hr is generous for real usage and hard-caps abuse.
    const rl = await rateLimit({
      key: keyFromRequest(request, "ai", session.user.email),
      max: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return Response.json(
        { error: "Too many AI requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
    // Per-IP cap too: accounts are free to create, so a per-account limit
    // alone is bypassable by signing up many accounts.
    const ipRl = await rateLimit({
      key: keyFromRequest(request, "ai-ip", null),
      max: 90,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipRl.ok) {
      return Response.json(
        { error: "Too many AI requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(ipRl.retryAfter) } },
      );
    }

    const body = await request.json();
    const { prompt } = body;
    const provider = body.provider || "anthropic";
    const max_tokens = clampMaxTokens(body.max_tokens);

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return Response.json({ error: `Prompt too long (max ${MAX_PROMPT_CHARS} characters)` }, { status: 413 });
    }
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return Response.json({ error: "Unsupported provider" }, { status: 400 });
    }

    // API keys come from server environment ONLY — never from the client
    const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
    const perplexityKey = process.env.PERPLEXITY_API_KEY || "";

    let result = "";

    if (provider === "perplexity") {
      if (!perplexityKey) {
        return Response.json({
          error: "Perplexity API key not configured on server",
          hint: "Add PERPLEXITY_API_KEY to Vercel environment variables"
        }, { status: 503 });
      }

      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${perplexityKey}` },
        body: JSON.stringify({
          model: "sonar-pro", max_tokens,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      if (!res.ok) {
        // Log upstream detail server-side; never echo it to the client.
        console.error("[AI] Perplexity error", res.status, (await res.text()).slice(0, 500));
        return Response.json({ error: "AI provider error. Please try again." }, { status: 502 });
      }
      const data = await res.json();
      result = data.choices?.[0]?.message?.content || "";
    } else {
      if (!anthropicKey) {
        return Response.json({
          error: "Anthropic API key not configured on server",
          hint: "Add ANTHROPIC_API_KEY to Vercel environment variables"
        }, { status: 503 });
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          // Server-chosen model from the allowlist (default: current Sonnet).
          model: resolveAnthropicModel(process.env.ANTHROPIC_MODEL),
          max_tokens,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      if (!res.ok) {
        // Log upstream detail server-side; never echo it to the client.
        console.error("[AI] Anthropic error", res.status, (await res.text()).slice(0, 500));
        return Response.json({ error: "AI provider error. Please try again." }, { status: 502 });
      }
      const data = await res.json();
      result = data.content?.[0]?.text || "";
    }

    // Usage signal — AI is the product's core value; track adoption.
    logEvent({ email: session.user.email, event: EVENTS.AI_USED, meta: { provider } });

    return Response.json({ result });
  } catch (error) {
    console.error("AI API Error:", error);
    return Response.json({ error: "AI request failed" }, { status: 500 });
  }
}
