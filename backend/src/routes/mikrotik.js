const express = require('express');
const router = express.Router();

/**
 * POST /api/mikrotik/push
 * Body: { script: string }
 * Pushes script commands to MikroTik via RouterOS API
 */
router.post('/push', async (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'script is required' });

  const host = process.env.MT_HOST;
  const user = process.env.MT_USER;
  const pass = process.env.MT_PASS;
  const port = parseInt(process.env.MT_PORT || '8728');

  if (!host || !user) {
    return res.status(503).json({ error: 'MikroTik API not configured. Set MT_HOST, MT_USER, MT_PASS in .env' });
  }

  try {
    // Dynamic import to avoid crash when package not installed
    const { RouterOSAPI } = require('node-routeros');
    const conn = new RouterOSAPI({ host, user, password: pass, port, timeout: 10 });

    await conn.connect();

    // Parse script lines and execute each command
    const commands = script
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    const results = [];
    for (const cmd of commands) {
      try {
        const parts = cmd.split(' ');
        const result = await conn.write(parts);
        results.push({ cmd, status: 'ok', result });
      } catch (e) {
        results.push({ cmd, status: 'error', message: e.message });
      }
    }

    await conn.close();
    res.json({ success: true, results });
  } catch (err) {
    console.error('MikroTik push error:', err);
    res.status(500).json({ error: 'Failed to connect to MikroTik', detail: err.message });
  }
});

module.exports = router;
