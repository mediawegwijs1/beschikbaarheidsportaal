// API & NETWORK HELPERS (Met Browser Keep-Alive)
async function apiCall(endpoint, method = "GET", payload = null) {
  if (!API_URL || API_URL.trim() === "") return { success: false, error: "Geen API URL" };
  try {
    let response;
    if (method === "GET") {
      const url = new URL(API_URL);
      for (const key in payload) url.searchParams.append(key, payload[key]);
      response = await fetch(url.toString(), { method: "GET" });
    } else {
      // keepalive: true zorgt dat het verzoek doorgaat als de docent het venster sluit
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
