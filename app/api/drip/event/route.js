import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/drip-client";

// POST /api/drip/event
// Body: { type, email, domain?, dripId?, payload? }
// Common types: "diagnostic_completed", "workspace_created",
//               "convert_chairaise-trial", "reply"

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  const { type, email } = body || {};
  if (!type || !email) {
    return NextResponse.json({ ok: false, error: "missing type or email" }, { status: 400 });
  }

  const result = await recordEvent({
    type,
    email,
    domain: body.domain || "chairaise.com",
    dripId: body.dripId,
    payload: body.payload,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result);
}
