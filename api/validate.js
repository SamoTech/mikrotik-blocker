// ============================================================
// MikroTik Blocker — api/validate.js
// Script Validator — checks generated .rsc for common issues
// POST /api/validate  { script: string }
// ============================================================

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { script } = req.body || {};
  if (!script || typeof script !== 'string')
    return res.status(400).json({ error: 'script field required' });

  const warnings = [];
  const errors   = [];
  const info     = [];

  const lines = script.split('\n');

  // ── Check 1: Duplicate address entries ───────────────────────
  const addressEntries = lines
    .filter(l => l.trim().startsWith('add list=') && l.includes('address='))
    .map(l => { const m = l.match(/address=([^\s]+)/); return m ? m[1] : null; })
    .filter(Boolean);
  const seen   = new Set();
  const dupes  = new Set();
  for (const addr of addressEntries) {
    if (seen.has(addr)) dupes.add(addr);
    seen.add(addr);
  }
  if (dupes.size > 0)
    warnings.push({ code: 'DUPLICATE_ADDRESSES', message: `${dupes.size} duplicate address(es) found`, detail: [...dupes].slice(0, 5) });

  // ── Check 2: Layer7 regex size ────────────────────────────────
  const l7Lines = lines.filter(l => l.includes('regexp='));
  for (const l of l7Lines) {
    const m = l.match(/regexp="([^"]+)"/);
    if (m && m[1].length > 2000)
      errors.push({ code: 'L7_REGEX_TOO_LONG', message: `Layer7 regex is ${m[1].length} chars — exceeds RouterOS 2 KB limit`, detail: m[1].substring(0, 60) + '...' });
    else if (m && m[1].length > 1500)
      warnings.push({ code: 'L7_REGEX_LONG', message: `Layer7 regex is ${m[1].length} chars — approaching RouterOS 2 KB limit` });
  }

  // ── Check 3: CIDR overlap detection (basic /16 vs /24) ───────
  const cidrLines = lines
    .filter(l => l.trim().startsWith('add list=') && l.match(/address=\d+\.\d+\.\d+\.\d+\/\d+/))
    .map(l => { const m = l.match(/address=(\d+\.\d+\.\d+\.\d+\/(\d+))/); return m ? m[1] : null; })
    .filter(Boolean);

  // Group by /16 prefix — if both /16 and a more specific exist, warn
  const prefixes16 = new Set(cidrLines.filter(c => c.endsWith('/16')).map(c => c.split('/')[0].split('.').slice(0,2).join('.')));
  const overlaps   = cidrLines.filter(c => {
    const parts = c.split('/')[0].split('.');
    return !c.endsWith('/16') && prefixes16.has(`${parts[0]}.${parts[1]}`);
  });
  if (overlaps.length > 0)
    warnings.push({ code: 'CIDR_OVERLAP', message: `${overlaps.length} CIDR(s) may be redundant (covered by a /16 range)`, detail: overlaps.slice(0, 3) });

  // ── Check 4: Empty list ───────────────────────────────────────
  if (addressEntries.length === 0)
    errors.push({ code: 'EMPTY_SCRIPT', message: 'No address entries found in script' });

  // ── Check 5: Missing firewall drop rule ───────────────────────
  const hasDropRule = lines.some(l => l.includes('action=drop') && l.includes('dst-address-list'));
  if (!hasDropRule && addressEntries.length > 0)
    warnings.push({ code: 'NO_DROP_RULE', message: 'No firewall drop rule found — addresses will be listed but not blocked' });

  // ── Summary ───────────────────────────────────────────────────
  info.push({ code: 'STATS', message: `${addressEntries.length} address entries, ${l7Lines.length} Layer7 rule(s)` });

  const valid = errors.length === 0;
  return res.status(200).json({ valid, errors, warnings, info });
};
