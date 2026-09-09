// API & NETWORK HELPERS (Met Browser Keep-Alive & Nederlandse Datumnotatie)
async function apiCall(endpoint, method = "GET", payload = null) {
  if (!API_URL || API_URL.trim() === "") return { success: false, error: "Geen API URL ingesteld." };
  try {
    let response;
    if (method === "GET") {
      const url = new URL(API_URL);
      for (const key in payload) url.searchParams.append(key, payload[key]);
      response = await fetch(url.toString(), { method: "GET" });
    } else {
      response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        keepalive: true
      });
    }
    return await response.json();
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function normalizeDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  let s = String(val).trim();
  if (s.includes('T')) s = s.split('T')[0];
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.split(/[-/]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const parts = s.split(/[-/]/);
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return s.substring(0, 10);
}

function formatDateNl(isoStr, shortMonth = false) {
  if (!isoStr) return "";
  const s = normalizeDateStr(isoStr);
  const parts = s.split('-');
  if (parts.length !== 3) return isoStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];

  const monthsShort = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  if (shortMonth) {
    return `${day} ${monthsShort[monthIdx]} ${year}`;
  }
  return `${String(day).padStart(2, '0')}-${parts[1]}-${year}`;
}

function formatPeriodNl(startIso, endIso) {
  if (!startIso || !endIso) return "";
  const p1 = normalizeDateStr(startIso).split('-');
  const p2 = normalizeDateStr(endIso).split('-');
  if (p1.length !== 3 || p2.length !== 3) return `${startIso} t/m ${endIso}`;

  const monthsShort = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const d1 = parseInt(p1[2], 10);
  const m1 = monthsShort[parseInt(p1[1], 10) - 1];
  const y1 = p1[0];

  const d2 = parseInt(p2[2], 10);
  const m2 = monthsShort[parseInt(p2[1], 10) - 1];
  const y2 = p2[0];

  if (y1 === y2) {
    if (m1 === m2) return `${d1} t/m ${d2} ${m1} ${y1}`;
    return `${d1} ${m1} t/m ${d2} ${m2} ${y1}`;
  }
  return `${d1} ${m1} ${y1} t/m ${d2} ${m2} ${y2}`;
}

function getCleanSortName(name) {
  let clean = String(name || '').toLowerCase().trim();
  const prefixes = ['sbo ', 'obs ', 'bs ', 'ikc ', 'so ', 'kpo ', 'rsg ', 'sws ', 'de ', 'het ', "'t ", 'een ', 'ten '];
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of prefixes) {
      if (clean.startsWith(p)) {
        clean = clean.slice(p.length).trim();
        changed = true;
      }
    }
  }
  return clean;
}

function Utilities_randomId() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}
