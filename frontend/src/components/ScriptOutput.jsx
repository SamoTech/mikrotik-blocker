import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ScriptOutput({ script, loading }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!script) return;
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik-block-${Date.now()}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script downloaded!');
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.25rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📜 RouterOS Script
        </h3>
        {script && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
              ⬇️ Download .rsc
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          Resolving domains...
        </div>
      )}

      {!loading && !script && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📝</div>
          <p>Enter domains and click Resolve to generate your MikroTik script</p>
        </div>
      )}

      {!loading && script && (
        <pre
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1rem',
            overflowX: 'auto',
            fontFamily: 'var(--mono)',
            fontSize: '0.8rem',
            lineHeight: 1.7,
            color: 'var(--text)',
            flex: 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {script}
        </pre>
      )}
    </div>
  );
}
