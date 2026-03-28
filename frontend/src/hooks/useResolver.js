import { useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
        category:    options.category    || null,
      });
      setResolved(data.resolved);
      setScript(data.script);
      setStats(data.stats);

      const { totalDomains, totalCIDRs, totalIPs, totalIPsV6, failed } = data.stats;
      if (failed > 0) {
        toast.error(`⚠️ ${failed} domain(s) failed to resolve`);
      } else {
        toast.success(
          `✅ ${totalDomains} domain(s) → ${totalCIDRs} CIDRs + ${totalIPs} IPs` +
          (totalIPsV6 ? ` + ${totalIPsV6} IPv6` : '')
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolved, script, stats, loading, error, resolve };
}
