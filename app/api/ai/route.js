// ============================================================
// ChaiRaise AI API Route — server-side proxy for Anthropic/Perplexity
// API keys are ONLY on the server — never exposed to the client
// ============================================================
import { auth } from "@/lib/auth";
import { rateLimit, keyFromRequest } from "@/lib/rateLimit";

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

    const body = await request.json();
    const { prompt, provider, max_tokens } = body;

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
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
          model: "sonar-pro", max_tokens: max_tokens || 1024,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return Response.json({ error: `Perplexity ${res.status}: ${t}` }, { status: res.status });
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
          // Current Sonnet — quality/cost balance for high-volume CRM AI.
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: max_tokens || 1024,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return Response.json({ error: `Anthropic ${res.status}: ${t}` }, { status: res.status });
      }
      const data = await res.json();
      result = data.content?.[0]?.text || "";
    }

    return Response.json({ result });
  } catch (error) {
    console.error("AI API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
