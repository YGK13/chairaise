// ============================================================
// ChaiRaise — /api/ai server-side guards
// Prompts are still assembled client-side (lib/ai.js), so the server enforces
// what it can: provider + model allowlists, output-token cap, prompt size.
// ============================================================
// Model is server-chosen from an allowlist; the client cannot pick it.
export const ALLOWED_ANTHROPIC_MODELS = [
  "claude-sonnet-5",            // default workhorse (drafting, research)
  "claude-opus-5-5",            // heavy reasoning
  "claude-haiku-4-5-20251001",  // cheap classify/extract
];
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
export const ALLOWED_PROVIDERS = ["anthropic", "perplexity"];
export const MAX_OUTPUT_TOKENS = 2048;
export const MAX_PROMPT_CHARS = 20000;

export function resolveAnthropicModel(envModel) {
  return ALLOWED_ANTHROPIC_MODELS.includes(envModel) ? envModel : DEFAULT_ANTHROPIC_MODEL;
}

/** Clamp a client-requested max_tokens to [1, MAX_OUTPUT_TOKENS]; default 1024. */
export function clampMaxTokens(n) {
  const v = Number.parseInt(n, 10);
  if (!Number.isFinite(v) || v <= 0) return 1024;
  return Math.min(v, MAX_OUTPUT_TOKENS);
}
