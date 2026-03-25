// ============================================================
// ChaiRaise — Storage & Org Management Utilities
// Org-scoped localStorage with multi-tenant isolation
// ============================================================

import { DEFAULT_ORG, DEFAULT_TEMPLATES, DEFAULT_COMMUNITY_MAP, EMPTY_ORG_PROFILE, ROLES } from "./constants";

// ============================================================
// ORG MANAGEMENT — active org, org list, org profiles
// ============================================================
export const getActiveOrg = () => { try { return JSON.parse(localStorage.getItem("crm_active_org")) || DEFAULT_ORG } catch { return DEFAULT_ORG } };
export const setActiveOrg = (org) => { try { localStorage.setItem("crm_active_org", JSON.stringify(org)) } catch {} };
export const getOrgList = () => { try { return JSON.parse(localStorage.getItem("crm_org_list")) || [DEFAULT_ORG] } catch { return [DEFAULT_ORG] } };
export const setOrgList = (list) => { try { localStorage.setItem("crm_org_list", JSON.stringify(list)) } catch {} };

// Org-scoped storage prefix — ensures data isolation between orgs
export const orgPrefix = () => getActiveOrg().id + "_";

// ============================================================
// ORG-SCOPED STORAGE — get/set with org prefix
// ============================================================
export const sGet = (k, fb) => { try { const v = localStorage.getItem(orgPrefix() + k); return v ? JSON.parse(v) : fb } catch { return fb } };
export const sSet = (k, v) => { try { localStorage.setItem(orgPrefix() + k, JSON.stringify(v)) } catch (e) { console.warn("Storage:", e) } };
// Legacy migration shim (ov2_ keys removed for ChaiRaise)
export const sGetMigrate = (k, fb) => sGet(k, fb);

// ============================================================
// ORG PROFILE — AI-researched org context
// ============================================================
export const getOrgProfile = () => { try { return JSON.parse(localStorage.getItem(orgPrefix() + "org_profile")) || { ...EMPTY_ORG_PROFILE } } catch { return { ...EMPTY_ORG_PROFILE } } };
export const setOrgProfileStore = (p) => { try { localStorage.setItem(orgPrefix() + "org_profile", JSON.stringify(p)) } catch {} };

// ============================================================
// ORG TEMPLATES — customizable per org
// ============================================================
export const getOrgTemplates = () => { try { const v = localStorage.getItem(orgPrefix() + "templates"); return v ? JSON.parse(v) : DEFAULT_TEMPLATES } catch { return DEFAULT_TEMPLATES } };
export const getOrgCommunityMap = () => { try { const v = localStorage.getItem(orgPrefix() + "community_map"); return v ? JSON.parse(v) : DEFAULT_COMMUNITY_MAP } catch { return DEFAULT_COMMUNITY_MAP } };

// ============================================================
// SESSION MANAGEMENT — user auth state
// ============================================================
export const getSession = () => { try { return JSON.parse(localStorage.getItem("crm_session")) || null } catch { return null } };
export const setSession = (s) => { try { localStorage.setItem("crm_session", JSON.stringify(s)) } catch {} };
export const clearSession = () => { try { localStorage.removeItem("crm_session") } catch {} };

// ============================================================
// USER MANAGEMENT — org-scoped user list
// ============================================================
export const getUsers = () => { try { return JSON.parse(localStorage.getItem(orgPrefix() + "users")) || [] } catch { return [] } };
export const setUsers = (u) => { try { localStorage.setItem(orgPrefix() + "users", JSON.stringify(u)) } catch {} };

// ============================================================
// PERMISSION CHECK — role-based access control
// ============================================================
export const hasPermission = (session, perm) => {
  if (!session) return false;
  const role = ROLES.find(r => r.id === session.role);
  if (!role) return false;
  return role.perms.includes("all") || role.perms.includes(perm);
};

// ============================================================
// AUDIT LOG — append-only action log
// ============================================================
export const getAuditLog = () => { try { return JSON.parse(localStorage.getItem(orgPrefix() + "audit_log")) || [] } catch { return [] } };
export const appendAudit = (entry) => {
  try {
    const log = getAuditLog();
    log.unshift({ ...entry, timestamp: new Date().toISOString(), id: Date.now() });
    if (log.length > 500) log.length = 500; // Cap at 500 entries
    localStorage.setItem(orgPrefix() + "audit_log", JSON.stringify(log));
  } catch {}
};

// ============================================================
// FORMATTING UTILITIES
// ============================================================
export const fmt$ = (n) => (!n || isNaN(n)) ? "—" : "$" + Number(n).toLocaleString("en-US");
export const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const fmtN = (n) => (!n || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US");
export const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
