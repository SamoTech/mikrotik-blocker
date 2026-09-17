'use strict';

const { analyze } = require('../tools/firewall-doctor');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const config = typeof body.config === 'string' ? body.config : '';
    if (!config.trim()) return res.status(400).json({ error: 'RouterOS export is required' });
    if (config.length > 2_000_000) return res.status(413).json({ error: 'RouterOS export is too large (2 MB limit)' });

    const result = analyze(config);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: 'Unable to analyze RouterOS export', detail: error.message });
  }
};
