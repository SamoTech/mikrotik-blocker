const express = require('express');
const router = express.Router();
const { resolveMultiple } = require('../services/dns');
const { generateScript } = require('../services/scriptGen');

/**
 * POST /api/resolve
 * Body: { domains: string[], listName?: string, addFirewallRule?: boolean }
 * Returns: { resolved: [...], script: string }
 */
router.post('/', async (req, res) => {
  const { domains, listName, addFirewallRule } = req.body;

  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    return res.status(400).json({ error: 'domains array is required' });
  }

  const cleanDomains = domains
    .map(d => d.trim())
    .filter(Boolean)
    .filter(d => /^[a-zA-Z0-9.-]+$/.test(d.replace(/^https?:\/\//i, '').split('/')[0]));

  if (cleanDomains.length === 0) {
    return res.status(400).json({ error: 'No valid domains provided' });
  }

  try {
    const resolved = await resolveMultiple(cleanDomains);
    const script = generateScript(resolved, { listName, addFirewallRule });
    res.json({ resolved, script });
  } catch (err) {
    console.error('Resolve error:', err);
    res.status(500).json({ error: 'DNS resolution failed', detail: err.message });
  }
});

module.exports = router;
