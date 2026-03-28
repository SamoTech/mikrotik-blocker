import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function MikroTikPush({ script }) {
  const [pushing, setPushing] = useState(false);
  const [results, setResults] = useState(null);

  const handlePush = async () => {
    if (!script) { toast.error('Generate a script first'); return; }
    setPushing(true);
    setResults(null);
    try {
      const { data } = await axios.post('/api/mikrotik/push', { script });
      setResults(data.results);
      const errors = data.results.filter(r => r.status === 'error');
      if (errors.length === 0) {
        toast.success('✅ Script applied to MikroTik successfully!');
      } else {
        toast.error(`⚠️ ${errors.length} command(s) failed`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(msg);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
        🚀 Push to MikroTik via API
      </h3>

      <div
        style={{
          background: 'rgba(91,141,239,0.08)',
          border: '1px solid rgba(91,141,239,0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
        }}
      >
        ℹ️ Configure <code>MT_HOST</code>, <code>MT_USER</code>, and <code>MT_PASS</code> in your backend <code>.env</code> file to enable this feature.
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        onClick={handlePush}
        disabled={pushing || !script}
      >
        {pushing ? '⏳ Pushing...' : '🚀 Apply to MikroTik Now'}
      </button>

      {results && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Results:</h4>
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--surface2)',
                  border: `1px solid ${r.status === 'ok' ? 'var(--success)' : 'var(--danger)'}`,
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.77rem',
                  fontFamily: 'var(--mono)',
                  color: r.status === 'ok' ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {r.status === 'ok' ? '✅' : '❌'} {r.cmd}
                {r.message && <div style={{ color: 'var(--danger)', marginTop: '0.2rem' }}>{r.message}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
