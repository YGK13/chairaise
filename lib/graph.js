// ============================================================
// ChaiRaise — Social Graph Engine
// VCF Parser, LinkedIn CSV Parser, Fuzzy Matching, Edge Inference,
// BFS Path Finding, Graph Building
// ============================================================

// ============================================================
// VCF PARSER — parse vCard 3.0 files into structured contacts
// ============================================================
export const parseVCF = (vcfText) => {
  const contacts = [];
  const cards = vcfText.split(/BEGIN:VCARD/i).filter(c => c.trim());
  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    const contact = { id: "vc_" + contacts.length, source: "vcf", phones: [], emails: [], name: "", first: "", last: "", org: "", title: "", city: "", country: "" };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "END:VCARD" || trimmed.startsWith("VERSION:") || trimmed.startsWith("PRODID:")) continue;
      if (trimmed.startsWith("FN:")) { contact.name = trimmed.slice(3).trim(); }
      else if (trimmed.startsWith("N:") || trimmed.startsWith("N;")) {
        const nVal = trimmed.replace(/^N[;:][^:]*:/i, "").replace(/^N:/i, "");
        const parts = (trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : nVal).split(";");
        contact.last = (parts[0] || "").trim();
        contact.first = (parts[1] || "").trim();
        if (!contact.name && (contact.first || contact.last)) contact.name = ((contact.first + " " + contact.last).trim());
      }
      else if (/^TEL[;:]/i.test(trimmed)) { const val = trimmed.split(":").slice(1).join(":").trim(); if (val) contact.phones.push(val.replace(/[\s()-]/g, "")); }
      else if (/^EMAIL[;:]/i.test(trimmed)) { const val = trimmed.split(":").slice(1).join(":").trim(); if (val) contact.emails.push(val.toLowerCase()); }
      else if (trimmed.startsWith("ORG:") || trimmed.startsWith("ORG;")) { const val = trimmed.split(":").slice(1).join(":").replace(/;+$/, "").trim(); if (val) contact.org = val; }
      else if (trimmed.startsWith("TITLE:")) { contact.title = trimmed.slice(6).trim(); }
      else if (/^ADR[;:]/i.test(trimmed)) { const val = trimmed.split(":").slice(1).join(":"); const parts = val.split(";"); if (parts[3]) contact.city = parts[3].trim(); if (parts[6]) contact.country = parts[6].trim(); }
    }
    if (contact.name && contact.name.length > 1) contacts.push(contact);
  }
  return contacts;
};

// ============================================================
// LINKEDIN CSV PARSER — handles LinkedIn's 3-line disclaimer header
// ============================================================
export const parseLinkedInCSV = (csvText) => {
  const contacts = [];
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 5) return contacts;
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].toLowerCase().includes("first name")) { headerIdx = i; break }
  }
  if (headerIdx === -1) return contacts;
  const headers = []; let hc = "", hq = false;
  for (const ch of lines[headerIdx]) {
    if (ch === '"') { hq = !hq } else if (ch === "," && !hq) { headers.push(hc.trim().toLowerCase().replace(/"/g, "")); hc = "" } else { hc += ch }
  }
  headers.push(hc.trim().toLowerCase().replace(/"/g, ""));
  const findCol = (names) => headers.findIndex(h => names.some(n => h.includes(n)));
  const iFirst = findCol(["first name"]), iLast = findCol(["last name"]), iEmail = findCol(["email"]);
  const iURL = findCol(["url", "profile"]), iCompany = findCol(["company", "organization"]);
  const iPosition = findCol(["position", "title"]), iConnected = findCol(["connected"]);
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = []; let c = "", q = false;
    for (const ch of lines[i]) { if (ch === '"') { q = !q } else if (ch === "," && !q) { cols.push(c.trim()); c = "" } else { c += ch } }
    cols.push(c.trim());
    const first = (cols[iFirst] || "").replace(/"/g, "").trim();
    const last = (cols[iLast] || "").replace(/"/g, "").trim();
    const name = ((first + " " + last).trim());
    if (!name || name.length < 2) continue;
    contacts.push({
      id: "li_" + contacts.length, source: "linkedin", name, first, last,
      emails: (cols[iEmail] || "").replace(/"/g, "").trim().toLowerCase() ? [(cols[iEmail] || "").replace(/"/g, "").trim().toLowerCase()] : [],
      phones: [], org: (cols[iCompany] || "").replace(/"/g, "").trim(),
      title: (cols[iPosition] || "").replace(/"/g, "").trim(),
      linkedin_url: (iURL >= 0 ? (cols[iURL] || "") : "").replace(/"/g, "").trim(),
      connected_on: (cols[iConnected] || "").replace(/"/g, "").trim(), city: "", country: "",
    });
  }
  return contacts;
};

// ============================================================
// LEVENSHTEIN DISTANCE — for fuzzy name matching
// ============================================================
export const levenshtein = (a, b) => {
  if (!a || !b) return Math.max((a || "").length, (b || "").length);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[m][n];
};

// ============================================================
// PHONE NORMALIZATION
// ============================================================
export const normPhone = (p) => (p || "").replace(/\D/g, "").slice(-10);

// ============================================================
// FUZZY MATCH — match a contact against donor list (5 methods)
// ============================================================
export const fuzzyMatchDonor = (contact, donors) => {
  if (contact.emails?.length) {
    for (const email of contact.emails) {
      const d = donors.find(dd => dd.email && dd.email.toLowerCase() === email);
      if (d) return { donor: d, matchType: "email", confidence: 1.0 };
    }
  }
  if (contact.phones?.length) {
    for (const phone of contact.phones) {
      const cp = normPhone(phone);
      if (cp.length >= 7) {
        const d = donors.find(dd => { const dp = normPhone(dd.phone); return dp.length >= 7 && dp === cp; });
        if (d) return { donor: d, matchType: "phone", confidence: 0.95 };
      }
    }
  }
  const cName = (contact.name || "").toLowerCase().trim();
  if (cName.length > 3) {
    const d = donors.find(dd => (dd.name || "").toLowerCase().trim() === cName);
    if (d) return { donor: d, matchType: "name_exact", confidence: 0.9 };
  }
  if (cName.length > 5) {
    for (const d of donors) {
      const dName = (d.name || "").toLowerCase().trim();
      if (dName.length > 5) { const dist = levenshtein(cName, dName); if (dist <= 2) return { donor: d, matchType: "name_fuzzy", confidence: 0.7 - (dist * 0.1) }; }
    }
  }
  if (contact.last && contact.first) {
    const cLast = contact.last.toLowerCase(), cInit = contact.first[0].toLowerCase();
    for (const d of donors) {
      const parts = (d.name || "").split(" ");
      if (parts.length >= 2 && parts[parts.length - 1].toLowerCase() === cLast && parts[0][0]?.toLowerCase() === cInit) return { donor: d, matchType: "last_initial", confidence: 0.6 };
    }
  }
  return null;
};

// ============================================================
// EDGE INFERENCE — infer relationship signals between contact and donor
// ============================================================
export const inferEdges = (contact, donor) => {
  const signals = [];
  if (contact.org && donor.industry) {
    const cOrg = contact.org.toLowerCase(), dInd = donor.industry.toLowerCase();
    if (cOrg.includes(dInd) || dInd.includes(cOrg)) signals.push({ type: "shared_industry", label: `Industry: ${donor.industry}`, weight: 0.3 });
  }
  if (contact.org && donor.foundation) {
    if (contact.org.toLowerCase().includes(donor.foundation.toLowerCase())) signals.push({ type: "shared_foundation", label: `Foundation: ${donor.foundation}`, weight: 0.5 });
  }
  if (contact.city && donor.city && contact.city.toLowerCase() === donor.city.toLowerCase()) signals.push({ type: "shared_city", label: `City: ${donor.city}`, weight: 0.2 });
  if (contact.org && (donor.community || donor.synagogue)) {
    const cOrg = contact.org.toLowerCase(), dComm = (donor.community || donor.synagogue || "").toLowerCase();
    if (cOrg.includes(dComm) || dComm.includes(cOrg)) signals.push({ type: "shared_community", label: `Community: ${donor.community || donor.synagogue}`, weight: 0.4 });
  }
  if (contact.emails?.length && donor.email) {
    const cDomains = contact.emails.map(e => e.split("@")[1]).filter(Boolean);
    const dDomain = (donor.email || "").split("@")[1];
    if (dDomain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"].includes(dDomain)) {
      if (cDomains.includes(dDomain)) signals.push({ type: "shared_domain", label: `Email domain: @${dDomain}`, weight: 0.4 });
    }
  }
  if (contact.org && contact.source?.includes("linkedin")) {
    const cOrg = contact.org.toLowerCase();
    const donorOrgs = [donor.foundation, donor.community, donor.industry, ...(donor.board_positions || [])].filter(Boolean);
    for (const dOrg of donorOrgs) {
      if (dOrg.length > 3 && (cOrg.includes(dOrg.toLowerCase()) || dOrg.toLowerCase().includes(cOrg))) { signals.push({ type: "shared_company", label: `Company/Org: ${dOrg}`, weight: 0.45 }); break; }
    }
  }
  if (contact.title) {
    const tLow = contact.title.toLowerCase();
    if (/board|trustee|director|chairman|governor/.test(tLow)) {
      const focusMatch = (donor.focus_areas || []).some(f => tLow.includes(f.toLowerCase().split(" ")[0]));
      if (focusMatch) signals.push({ type: "board_overlap", label: `Board role: ${contact.title.slice(0, 40)}`, weight: 0.35 });
    }
    if (/rabbi|cantor|executive director|federation|uja|jnf|aipac|hadassah|bnai brith|chabad|ou\b|ncsy|hillel|yeshiva/.test(tLow)) {
      signals.push({ type: "jewish_org_leader", label: `Jewish org: ${contact.title.slice(0, 35)}`, weight: 0.3 });
    }
  }
  return signals;
};

// ============================================================
// EDGE STRENGTH — compute 0-1 strength from signals (diminishing returns)
// ============================================================
export const edgeStrength = (signals) => {
  if (!signals.length) return 0;
  let total = 0;
  const sorted = [...signals].sort((a, b) => b.weight - a.weight);
  sorted.forEach((s, i) => { total += s.weight * Math.pow(0.7, i) });
  return Math.min(total, 1.0);
};

// ============================================================
// BFS PATH FINDING — shortest path from YOU → donor (max 4 hops)
// ============================================================
export const bfsPath = (graph, startId, targetId) => {
  if (startId === targetId) return [];
  const visited = new Set([startId]);
  const queue = [[startId, []]];
  const adj = {};
  for (const e of graph.edges) {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    adj[e.from].push({ to: e.to, edge: e });
    adj[e.to].push({ to: e.from, edge: e });
  }
  while (queue.length > 0) {
    const [current, path] = queue.shift();
    const neighbors = adj[current] || [];
    for (const { to, edge } of neighbors) {
      if (visited.has(to)) continue;
      const newPath = [...path, { nodeId: to, edge }];
      if (to === targetId) return newPath;
      visited.add(to);
      if (newPath.length < 4) queue.push([to, newPath]);
    }
  }
  return null;
};

// ============================================================
// BUILD GRAPH — full social graph from contacts + donors
// Optimized with inverted keyword index for O(1) edge inference
// ============================================================
export const buildGraph = (contacts, donors, userId = "YOU") => {
  const nodes = [];
  const edges = [];
  nodes.push({ id: userId, type: "you", name: "You" });

  // Pre-index donors for O(1) matching
  const donorByEmail = new Map(), donorByPhone = new Map(), donorByNameLower = new Map();
  donors.forEach(d => {
    if (d.email) donorByEmail.set(d.email.toLowerCase(), d);
    if (d.phone) { const p = normPhone(d.phone); if (p.length >= 7) donorByPhone.set(p, d); }
    donorByNameLower.set((d.name || "").toLowerCase().trim(), d);
  });

  // Pre-compute donor keyword sets
  const donorOrgKeywords = new Map();
  donors.forEach(d => {
    const did = d.id || d.name;
    const keywords = new Set();
    [d.industry, d.foundation, d.community, d.synagogue, ...(d.board_positions || []), ...(d.focus_areas || [])]
      .filter(Boolean).forEach(v => v.toLowerCase().split(/[\s,;/]+/).filter(w => w.length > 3).forEach(w => keywords.add(w)));
    donorOrgKeywords.set(did, keywords);
  });

  const contactNodes = [];
  contacts.forEach(c => { contactNodes.push({ id: c.id, type: "contact", name: c.name, org: c.org, source: c.source }); });

  const matchedDonorIds = new Set();
  const contactDonorEdges = [];
  const contactsWithEdges = new Set();

  // Fast fuzzy match
  const fastFuzzyMatch = (contact) => {
    if (contact.emails?.length) { for (const email of contact.emails) { const d = donorByEmail.get(email); if (d) return { donor: d, matchType: "email", confidence: 1.0 }; } }
    if (contact.phones?.length) { for (const phone of contact.phones) { const cp = normPhone(phone); if (cp.length >= 7) { const d = donorByPhone.get(cp); if (d) return { donor: d, matchType: "phone", confidence: 0.95 }; } } }
    const cName = (contact.name || "").toLowerCase().trim();
    if (cName.length > 3) { const d = donorByNameLower.get(cName); if (d) return { donor: d, matchType: "name_exact", confidence: 0.9 }; }
    if (contact.last && contact.first) {
      const cLast = contact.last.toLowerCase(), cInit = contact.first[0]?.toLowerCase();
      for (const d of donors) { const parts = (d.name || "").split(" "); if (parts.length >= 2 && parts[parts.length - 1].toLowerCase() === cLast && cInit === parts[0][0]?.toLowerCase()) return { donor: d, matchType: "last_initial", confidence: 0.6 }; }
    }
    if (cName.length > 5) {
      for (const d of donors) { const dName = (d.name || "").toLowerCase().trim(); if (dName.length > 5 && Math.abs(cName.length - dName.length) <= 2) { const dist = levenshtein(cName, dName); if (dist <= 2) return { donor: d, matchType: "name_fuzzy", confidence: 0.7 - (dist * 0.1) }; } }
    }
    return null;
  };

  // Inverted keyword index for O(1) edge inference
  const donorKeywordIndex = new Map();
  donors.forEach(d => {
    const did = d.id || d.name;
    const keywords = donorOrgKeywords.get(did);
    if (keywords) keywords.forEach(w => { if (!donorKeywordIndex.has(w)) donorKeywordIndex.set(w, new Set()); donorKeywordIndex.get(w).add(did); });
  });
  const donorDomainIndex = new Map();
  const commonDomains = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]);
  donors.forEach(d => { if (d.email) { const domain = (d.email || "").split("@")[1]; if (domain && !commonDomains.has(domain)) donorDomainIndex.set(domain, d.id || d.name); } });

  const fastInferEdges = (contact) => {
    if (!contact.org && !contact.emails?.length && !contact.title) return [];
    const results = new Map();
    const addSignal = (did, signal) => { if (!results.has(did)) results.set(did, []); results.get(did).push(signal); };
    if (contact.org) {
      const words = contact.org.toLowerCase().split(/[\s,;/&.]+/).filter(w => w.length > 3);
      const matchedDonors = new Set();
      words.forEach(w => { const dids = donorKeywordIndex.get(w); if (dids) dids.forEach(did => { if (!matchedDonors.has(did)) { matchedDonors.add(did); addSignal(did, { type: "shared_org", label: `Org: "${w}"`, weight: 0.3 }); } }); });
    }
    if (contact.emails?.length) { contact.emails.forEach(email => { const domain = email.split("@")[1]; if (domain) { const did = donorDomainIndex.get(domain); if (did) addSignal(did, { type: "shared_domain", label: `@${domain}`, weight: 0.4 }); } }); }
    if (contact.title) {
      const tLow = contact.title.toLowerCase();
      if (/rabbi|cantor|federation|uja|jnf|aipac|hadassah|chabad|hillel|yeshiva/.test(tLow)) {
        donors.slice(0, 20).forEach(d => { addSignal(d.id || d.name, { type: "jewish_org", label: `Jewish org: ${contact.title.slice(0, 30)}`, weight: 0.25 }); });
      }
    }
    const out = [];
    results.forEach((signals, did) => { const strength = edgeStrength(signals); if (strength >= 0.15) out.push({ donorId: did, signals, strength }); });
    return out;
  };

  // Process contacts
  contacts.forEach(c => {
    const match = fastFuzzyMatch(c);
    if (match) {
      matchedDonorIds.add(match.donor.id || match.donor.name);
      edges.push({ from: c.id, to: "d_" + (match.donor.id || match.donor.name), strength: match.confidence, signals: [{ type: "identity_match", label: `Matched: ${match.matchType} (${Math.round(match.confidence * 100)}%)`, weight: match.confidence }] });
      contactDonorEdges.push({ contactId: c.id, donorId: match.donor.id || match.donor.name, confidence: match.confidence, matchType: match.matchType });
      contactsWithEdges.add(c.id);
    }
    const inferred = fastInferEdges(c);
    inferred.forEach(({ donorId, signals, strength }) => {
      if (match && (match.donor.id || match.donor.name) === donorId) return;
      edges.push({ from: c.id, to: "d_" + donorId, strength, signals });
      contactsWithEdges.add(c.id);
    });
  });

  contactNodes.forEach(cn => { nodes.push(cn); });
  contactsWithEdges.forEach(cId => { edges.push({ from: userId, to: cId, strength: 0.5, signals: [{ type: "direct_contact", label: "Your contact", weight: 0.5 }] }); });
  donors.forEach(d => { const did = d.id || d.name; nodes.push({ id: "d_" + did, type: "donor", name: d.name, tier: d.tier, city: d.city, community: d.community }); });

  const graph = { nodes, edges };
  const donorPaths = {};
  donors.forEach(d => { const did = d.id || d.name; const path = bfsPath(graph, userId, "d_" + did); if (path) donorPaths[did] = { path, hops: path.length }; });

  return { nodes, edges, donorPaths, matchedDonorIds, contactDonorEdges };
};
