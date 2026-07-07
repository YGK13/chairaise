// ============================================================
// ChaiRaise — Public Contact / Sales inquiry endpoint
// POST /api/contact — emails the inquiry to the ChaiRaise owner via Resend.
// Public (no auth) with a honeypot to deter bots. Degrades gracefully if email
// isn't configured (still returns ok so the UI doesn't look broken).
// ============================================================
import { Resend } from "resend";
import { rateLimit, keyFromRequest } from "@/lib/rateLimit";

// Resend sandbox can only deliver to the account owner's address, which is
// exactly who should receive sales inquiries. Override via CONTACT_EMAIL once a
// domain is verified.
const TO = process.env.CONTACT_EMAIL || "yuri.kruman@gmail.com";
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function POST(req) {
  try {
    // Rate limit BEFORE we parse the body: the contact form is unauthenticated
    // and public, which makes it the easiest DoS surface in the app. 5
    // submissions per IP per hour is well above what a real prospect needs
    // and hard-caps a bot flood.
    const rl = await rateLimit({
      key: keyFromRequest(req, "contact"),
      max: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return Response.json(
        { error: "Too many submissions from this IP. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name = "", email = "", org = "", message = "", plan = "", website } = body;

    // Honeypot: real users never fill the hidden "website" field.
    if (website) return Response.json({ ok: true });

    if (!email || !message) {
      return Response.json({ error: "Email and message are required." }, { status: 400 });
    }
    // Light email sanity check.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      // No email configured — log and accept so the form still "works".
      console.log("[Contact] (email not configured)", { name, email, org, message });
      return Response.json({ ok: true, delivered: false });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const safe = (s) => String(s).replace(/[<>]/g, "");
    const { error } = await resend.emails.send({
      from: `ChaiRaise <${FROM}>`,
      to: [TO],
      reply_to: email,
      subject: `ChaiRaise inquiry${plan ? ` (${plan})` : ""} — ${safe(name) || email}`,
      html: `
        <h2>New ChaiRaise inquiry</h2>
        <p><strong>Name:</strong> ${safe(name) || "—"}</p>
        <p><strong>Email:</strong> ${safe(email)}</p>
        <p><strong>Organization:</strong> ${safe(org) || "—"}</p>
        <p><strong>Interested in:</strong> ${safe(plan) || "General"}</p>
        <hr/>
        <p style="white-space:pre-wrap">${safe(message)}</p>
      `,
      text: `New ChaiRaise inquiry\nName: ${name}\nEmail: ${email}\nOrg: ${org}\nInterested in: ${plan}\n\n${message}`,
    });

    if (error) {
      console.error("[Contact] Resend error:", error);
      return Response.json({ error: "Could not send right now. Email hello@chairaise.com directly." }, { status: 502 });
    }
    return Response.json({ ok: true, delivered: true });
  } catch (e) {
    console.error("[Contact] error:", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
