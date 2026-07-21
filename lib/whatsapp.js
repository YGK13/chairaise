// ============================================================
// ChaiRaise — Click-to-WhatsApp
//
// Privacy-first by construction: we never hold a WhatsApp session, never proxy
// a message, and no donor data touches Meta's servers through us. We build a
// wa.me deep link that opens the fundraiser's OWN WhatsApp with the message
// pre-filled; they press send. The CRM logs that outreach happened.
//
// (The legacy localhost bridge remains a self-hosted power-user option; it is
// not part of the hosted product.)
// ============================================================

/** Strip everything but digits — wa.me wants a bare E.164 number, no "+". */
export function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 7 ? digits : "";
}

/** Fill the merge fields used across ChaiRaise templates. */
export function personalize(template, donor = {}, org = {}) {
  const first = String(donor.name || "").trim().split(/\s+/)[0] || "";
  return String(template || "")
    .replace(/\{first\}/gi, first)
    .replace(/\{name\}/gi, donor.name || "")
    .replace(/\{community\}/gi, donor.community || "")
    .replace(/\{city\}/gi, donor.city || "")
    .replace(/\{school\}/gi, donor.school || "")
    .replace(/\{orgname\}/gi, org.name || "")
    .replace(/\{org\}/gi, org.name || "");
}

/**
 * Build the click-to-chat URL. Returns null when the donor has no usable
 * phone number, so callers can disable the button instead of opening a
 * broken tab.
 */
export function waLink(phone, message) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const text = String(message || "").slice(0, 1500); // keep the URL sane
  return `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Convenience: personalized link for a donor in one call. */
export function waLinkForDonor(donor = {}, template = "", org = {}) {
  return waLink(donor.phone, personalize(template, donor, org));
}

/** A short, warm default opener a fundraiser can edit before sending. */
export const DEFAULT_WA_TEMPLATE =
  "Hi {first}, it's {orgname}. I wanted to reach out personally about what we're building this year — do you have a few minutes this week to connect?";
