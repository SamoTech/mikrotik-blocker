import { useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Works in both dev (proxied) and Vercel production (same origin /api/*)
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function useResolver() {
  const [resolved, setResolved] = useState([]);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolve = useCallback(async (domains, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/resolve`, {
        domains,
        listName: options.listName || 'blocked_sites',
        addFirewallRule: options.addFirewallRule !== false,
      });
      setResolved(data.resolved);
      setScript(data.script);
      const failed = data.resolved.filter(r => r.error);
      if (failed.length) {
        toast.error(`⚠️ ${failed.length} domain(s) failed to resolve`);
      } else {
        toast.success(`✅ Resolved ${data.resolved.length} domain(s)`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolved, script, loading, error, resolve };
}
