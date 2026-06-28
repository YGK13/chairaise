// Drip engine client. Calls the engine to enroll subscribers and record
// behavior events. Engine URL + auth secret come from env. Failures are
// logged but never thrown to the caller: a drip outage must not break
// the primary product flow.

const ENGINE_URL = process.env.DRIP_ENGINE_URL || "";
const SECRET = process.env.DRIP_INGEST_SECRET || "";

function ready() {
  if (!ENGINE_URL || !SECRET) {
    console.warn("[drip-client] DRIP_ENGINE_URL or DRIP_INGEST_SECRET missing; skipping call");
    return false;
  }
  return true;
}

async function call(path, body) {
  if (!ready()) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(`${ENGINE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      console.error(`[drip-client] ${path} failed (HTTP ${res.status})`, data);
      return { ok: false, status: res.status, error: data.error };
    }
    return { ok: true, ...data };
  } catch (err) {
    console.error(`[drip-client] ${path} threw`, err?.message || err);
    return { ok: false, error: "request_failed" };
  }
}

export async function enrollSubscriber({ dripId, email, domain, firstName, source, utm, meta }) {
  if (!dripId || !email || !domain) {
    return { ok: false, error: "missing_required_fields" };
  }
  return call("/api/drip/enroll", { dripId, email, domain, firstName, source, utm, meta });
}

export async function recordEvent({ type, email, domain, dripId, payload }) {
  if (!type || !email || !domain) {
    return { ok: false, error: "missing_required_fields" };
  }
  return call("/api/drip/event", { type, email, domain, dripId, payload });
}
