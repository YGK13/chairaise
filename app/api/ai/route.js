// ============================================================
// ChaiRaise AI API Route — server-side proxy for Anthropic/Perplexity
// Eliminates CORS issues and keeps API keys server-side
// ============================================================
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, provider, max_tokens, anthropicKey: clientKey, perplexityKey: clientPplxKey } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Prefer env vars (production) but fall back to client-provided keys (MVP/demo)
    const anthropicKey = process.env.ANTHROPIC_API_KEY || clientKey || '';
    const perplexityKey = process.env.PERPLEXITY_API_KEY || clientPplxKey || '';

    let result = '';

    if (provider === 'perplexity') {
      if (!perplexityKey) return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 401 });

      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${perplexityKey}` },
        body: JSON.stringify({ model: 'sonar-pro', max_tokens: max_tokens || 1024, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) { const t = await res.text(); return NextResponse.json({ error: `Perplexity ${res.status}: ${t}` }, { status: res.status }); }
      const data = await res.json();
      result = data.choices?.[0]?.message?.content || '';
    } else {
      if (!anthropicKey) return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 401 });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: max_tokens || 1024, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) { const t = await res.text(); return NextResponse.json({ error: `Anthropic ${res.status}: ${t}` }, { status: res.status }); }
      const data = await res.json();
      result = data.content?.[0]?.text || '';
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
