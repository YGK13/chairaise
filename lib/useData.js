// ============================================================
// ChaiRaise — useData Hook
// Central data access layer that bridges frontend ↔ database
//
// Strategy: Database-first with localStorage fallback
// - If DATABASE_URL is configured → API routes → Neon Postgres
// - If no database → falls back to localStorage (dev/demo mode)
//
// This lets the CRM work both ways during transition:
// existing localStorage data still works, new data goes to DB
// ============================================================

// ---- API fetch helper with error handling ----
const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
};

// ============================================================
// DONORS — CRUD operations
// ============================================================
export const donorsAPI = {
  // List all donors for an org
  async list(orgId) {
    try {
      const data = await apiFetch(`/api/donors?org_id=${encodeURIComponent(orgId)}`);
      return data.donors || [];
    } catch (e) {
      console.warn("DB donors unavailable, using localStorage:", e.message);
      return null; // null signals "use localStorage fallback"
    }
  },

  // Create a new donor
  async create(orgId, donor) {
    return apiFetch("/api/donors", {
      method: "POST",
      body: JSON.stringify({ ...donor, org_id: orgId }),
    });
  },

  // Update a donor
  async update(donorId, updates) {
    return apiFetch(`/api/donors/${donorId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // Delete a donor
  async remove(donorId) {
    return apiFetch(`/api/donors/${donorId}`, { method: "DELETE" });
  },

  // Bulk import donors (array)
  async bulkCreate(orgId, donors) {
    const results = { created: 0, errors: [] };
    for (const donor of donors) {
      try {
        await donorsAPI.create(orgId, donor);
        results.created++;
      } catch (e) {
        results.errors.push({ name: donor.name, error: e.message });
      }
    }
    return results;
  },
};

// ============================================================
// DONATIONS — Gift history records
// ============================================================
export const donationsAPI = {
  // List donations for a donor or org
  async list(orgId, donorId = null) {
    const url = donorId
      ? `/api/donations?org_id=${encodeURIComponent(orgId)}&donor_id=${donorId}`
      : `/api/donations?org_id=${encodeURIComponent(orgId)}`;
    try {
      return await apiFetch(url);
    } catch (e) {
      console.warn("DB donations unavailable:", e.message);
      return null;
    }
  },

  // Record a new donation
  async create(orgId, donation) {
    return apiFetch("/api/donations", {
      method: "POST",
      body: JSON.stringify({ ...donation, org_id: orgId }),
    });
  },
};

// ============================================================
// ORGANIZATIONS — Org management
// ============================================================
export const orgsAPI = {
  async list() {
    try {
      return await apiFetch("/api/orgs");
    } catch (e) {
      console.warn("DB orgs unavailable:", e.message);
      return null;
    }
  },

  async create(orgData) {
    return apiFetch("/api/orgs", {
      method: "POST",
      body: JSON.stringify(orgData),
    });
  },
};

// ============================================================
// EMAIL — Send real emails via Resend
// ============================================================
export const emailAPI = {
  async send({ to, subject, html, text, from_name, org_id, donor_id, template_id, reply_to }) {
    return apiFetch("/api/email", {
      method: "POST",
      body: JSON.stringify({ to, subject, html, text, from_name, org_id, donor_id, template_id, reply_to }),
    });
  },
};

// ============================================================
// AI — Server-side AI calls (keys never touch client)
// ============================================================
export const aiAPI = {
  async call(prompt, provider = "anthropic") {
    return apiFetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ prompt, provider }),
    });
  },
};

// ============================================================
// SETUP — Initialize database schema
// ============================================================
export const setupAPI = {
  async initDB(secret) {
    return apiFetch("/api/setup", {
      method: "POST",
      body: JSON.stringify({ secret }),
    });
  },
};

// ============================================================
// DB AVAILABILITY CHECK — determines if we use DB or localStorage
// ============================================================
let _dbAvailable = null;
export const checkDBAvailable = async () => {
  if (_dbAvailable !== null) return _dbAvailable;
  try {
    const res = await fetch("/api/donors?org_id=__healthcheck__");
    // If we get a proper JSON response (even empty), DB is available
    // If we get a 500 with "DATABASE_URL" error, it's not configured
    const data = await res.json();
    _dbAvailable = !data.error?.includes("DATABASE_URL");
    return _dbAvailable;
  } catch {
    _dbAvailable = false;
    return false;
  }
};

// Reset cache (useful after provisioning DB)
export const resetDBCheck = () => { _dbAvailable = null; };
