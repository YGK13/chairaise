// ============================================================
// ChaiRaise — Per-org outbound mail (bring-your-own mailbox)
//
// Fundraisers send from THEIR OWN address via THEIR OWN mail server. We only
// relay: the message never sits in a shared ChaiRaise mailbox, and the SMTP
// password is decrypted in memory for the single send, never logged.
//
// Falls back to the platform sender (Resend) only when an org hasn't connected
// a mailbox yet.
// ============================================================
import nodemailer from "nodemailer";
import { getOrgEmailSettings } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

/** Build a nodemailer transport from an org's stored settings, or null. */
export async function getOrgTransport(orgId) {
  const s = await getOrgEmailSettings(orgId);
  if (!s?.smtp_host || !s?.smtp_user || !s?.from_email) return null;
  const pass = decryptSecret(s.smtp_pass_encrypted);
  if (!pass) return null;

  const transport = nodemailer.createTransport({
    host: s.smtp_host,
    port: Number(s.smtp_port) || 587,
    secure: !!s.smtp_secure, // true => implicit TLS (465); false => STARTTLS (587)
    auth: { user: s.smtp_user, pass },
    // Never silently accept a bad certificate — this is a donor-data path.
    tls: { rejectUnauthorized: true },
  });
  return { transport, settings: s };
}

/** Format the From header from an org's settings. */
export function formatFrom(settings, overrideName) {
  const name = overrideName || settings.from_name || "";
  return name ? `${name} <${settings.from_email}>` : settings.from_email;
}

/**
 * Send through the org's own SMTP. Returns { id, via, from } on success, or
 * null when the org has no mailbox connected (caller should fall back).
 * Throws on an actual SMTP failure so the caller can surface a real error.
 */
export async function sendViaOrgSmtp(orgId, { to, subject, html, text, replyTo, fromName }) {
  const t = await getOrgTransport(orgId);
  if (!t) return null;
  const from = formatFrom(t.settings, fromName);
  const info = await t.transport.sendMail({
    from,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html: html || undefined,
    text: text || undefined,
    replyTo: replyTo || t.settings.from_email,
  });
  return { id: info.messageId, via: "smtp", from };
}

/** Verify credentials by opening an SMTP connection (no message sent). */
export async function verifyOrgSmtp(orgId) {
  const t = await getOrgTransport(orgId);
  if (!t) return { ok: false, error: "No mailbox connected." };
  try {
    await t.transport.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
