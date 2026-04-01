// Vercel Serverless Function — POST /api/mikrotik/push
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- API Key Authentication ---
  const apiKey = process.env.PUSH_API_KEY;
  if (apiKey) {
    const provided = req.headers['x-api-key'];
    if (!provided || provided !== apiKey) {
      return res.status(401).json({ error: 'Unauthorized', detail: 'Invalid or missing X-API-Key header' });
    }
  }

  const { script } = req.body || {};
  if (!script) return res.status(400).json({ error: 'script is required' });

  const host = process.env.MT_HOST;
  const user = process.env.MT_USER;
  const pass = process.env.MT_PASS || '';
  const port = parseInt(process.env.MT_PORT || '8728');

  if (!host || !user) {
    return res.status(503).json({
      error: 'MikroTik API not configured',
      detail: 'Set MT_HOST, MT_USER, MT_PASS in Vercel Environment Variables'
    });
  }

  try {
    const { RouterOSAPI } = require('node-routeros');
    const conn = new RouterOSAPI({ host, user, password: pass, port, timeout: 10 });
    await conn.connect();

    const commands = script
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && !l.startsWith(':'));

    const results = [];
    for (const cmd of commands) {
      try {
        const result = await conn.write(cmd.split(' '));
        results.push({ cmd, status: 'ok', result });
      } catch (e) {
        results.push({ cmd, status: 'error', message: e.message });
      }
    }

    await conn.close();
    return res.status(200).json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ error: 'MikroTik connection failed', detail: err.message });
  }
};
