// ============================================================
// ChaiRaise — CSV Parser & Export Utilities
// ============================================================

// ============================================================
// CSV PARSER — handles quoted fields, commas in values, newlines
// ============================================================
export const parseCSV = (text) => {
  const rows = []; let cur = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]; const next = text[i + 1];
    if (ch === '"') { if (inQ && next === '"') { field += '"'; i++; } else { inQ = !inQ } }
    else if (ch === ',' && !inQ) { cur.push(field.trim()); field = "" }
    else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQ) { cur.push(field.trim()); rows.push(cur); cur = []; field = ""; if (ch === '\r') i++; }
    else { field += ch }
  }
  if (field || cur.length) { cur.push(field.trim()); rows.push(cur); }
  return rows;
};

// ============================================================
// CSV EXPORT — convert array of objects to downloadable CSV
// ============================================================
export const exportToCSV = (data, filename, columns) => {
  const headers = columns.map(c => c.label);
  const rows = data.map(row => columns.map(c => {
    let val = row[c.key];
    if (Array.isArray(val)) val = val.join("; ");
    if (val === null || val === undefined) val = "";
    val = String(val);
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      val = '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  }));
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename || "export.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
