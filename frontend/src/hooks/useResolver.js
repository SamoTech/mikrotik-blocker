import { useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function extractMsg(err) {
  // Never pass an object to toast/setState — always stringify
  const data = err?.response?.data;
  if (data) {
    if (typeof data.error   === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail  === 'string') return data.detail;
    return JSON.stringify(data).slice(0, 120);
  }
  return typeof err?.message === 'string' ? err.message : String(err);
}

export default function useResolver() {
  const [resolved, setResolved] = useState([]);
  const [script,   setScript]   = useState('');
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const resolve = useCallback(async (domains, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/resolve`, {
        domains,
        listName:    options.listName    || 'blocked',
        outputMode:  options.outputMode  || 'both',
        addFilter:   options.addFilter   !== false,
        addSrcBlock: options.addSrcBlock || false,
        includeIPv6: options.includeIPv6 !== false,
        addLayer7:   options.addLayer7   || false,
        routerOS:    options.routerOS    || 'v7',
        category:    options.category    || null,
      });

      setResolved(Array.isArray(data.resolved) ? data.resolved : []);
      setScript(typeof data.script === 'string' ? data.script : '');
      setStats(data.stats && typeof data.stats === 'object' ? data.stats : null);

      const s = data.stats || {};
      const failed       = Number(s.failed       ?? 0);
      const totalDomains = Number(s.totalDomains ?? 0);
      const totalCIDRs   = Number(s.totalCIDRs   ?? 0);
      const totalIPs     = Number(s.totalIPs     ?? 0);
      const totalIPsV6   = Number(s.totalIPsV6   ?? 0);

      if (failed > 0) {
        toast.error(`⚠️ ${failed} domain(s) failed to resolve`);
      } else {
        toast.success(
          `✅ ${totalDomains} domain(s) → ${totalCIDRs} CIDRs + ${totalIPs} IPs` +
          (totalIPsV6 ? ` + ${totalIPsV6} IPv6` : '')
        );
      }
    } catch (err) {
      const msg = extractMsg(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolved, script, stats, loading, error, resolve };
}
