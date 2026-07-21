// ============================================================
// ChaiRaise — Field-level encryption (AES-256-GCM)
//
// Used for secrets we must store and later USE (so they can't be one-way
// hashed) — currently per-org SMTP passwords. Neon already encrypts at rest;
// this adds a second layer so a database dump alone never exposes a customer's
// mail credentials.
//
// Key: ENCRYPTION_KEY env if present, otherwise derived from AUTH_SECRET so the
// feature works without extra config. Rotating either re-keys everything, which
// invalidates stored secrets by design (they must be re-entered).
// ============================================================
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";

function key() {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("No ENCRYPTION_KEY or AUTH_SECRET configured for field encryption");
  // Fixed salt: we need the same key every boot; the secret supplies the entropy.
  return scryptSync(secret, "chairaise-field-encryption-v1", 32);
}

/** Encrypt a UTF-8 string. Returns "v1.<iv>.<tag>.<ciphertext>" (base64url parts). */
export function encryptSecret(plain) {
  if (plain === null || plain === undefined || plain === "") return "";
  const iv = randomBytes(12);
  const c = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

/** Decrypt a value produced by encryptSecret(). Returns "" if absent/invalid. */
export function decryptSecret(payload) {
  if (!payload) return "";
  try {
    const [v, ivB, tagB, dataB] = String(payload).split(".");
    if (v !== "v1" || !ivB || !tagB || !dataB) return "";
    const d = createDecipheriv(ALGO, key(), Buffer.from(ivB, "base64url"));
    d.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([d.update(Buffer.from(dataB, "base64url")), d.final()]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext — never throw into a request path.
    return "";
  }
}

/** True when a stored value looks like our ciphertext (not plaintext). */
export function isEncrypted(payload) {
  return typeof payload === "string" && payload.startsWith("v1.") && payload.split(".").length === 4;
}
