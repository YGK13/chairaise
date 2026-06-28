import { NextResponse } from "next/server";
import { enrollSubscriber } from "@/lib/drip-client";

// POST /api/drip/enroll
// Body: { dripId, email, domain?, firstName?, source?, utm?, meta? }
// Defaults: domain = "chairaise.com".
// Common dripIds: "chairaise-brief" (newsletter signup),
//                 "chairaise-diagnostic" (after Donor Pipeline Health quiz)
//                 For diagnostic, meta must include { score, tier, weakest }.

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  const { dripId, email } = body || {};
  if (!dripId || !email) {
    return NextResponse.json({ ok: false, error: "missing dripId or email" }, { status: 400 });
  }

  const result = await enrollSubscriber({
    dripId,
    email,
    domain: body.domain || "chairaise.com",
    firstName: body.firstName,
    source: body.source || "chairaise-app",
    utm: body.utm,
    meta: body.meta,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    engineConfigured: Boolean(process.env.DRIP_ENGINE_URL && process.env.DRIP_INGEST_SECRET),
  });
}
