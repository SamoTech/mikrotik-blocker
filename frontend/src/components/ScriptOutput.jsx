import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import ScriptDiff from './ScriptDiff';

function safeStr(val) {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  return JSON.stringify(val);
}

export default function ScriptOutput({ script, loading }) {
  const [previousScript, setPreviousScript] = useState(null);
  const [validating, setValidating]         = useState(false);
  const [validation, setValidation]         = useState(null);
  const [showDiff, setShowDiff]             = useState(false);
  const prevRef = useRef(null);

  useEffect(() => {
    if (script && prevRef.current && prevRef.current !== script) {
      setPreviousScript(prevRef.current);
      setShowDiff(true);
    }
    if (script) prevRef.current = script;
    setValidation(null);
  }, [script]);

  async function handleValidate() {
    if (!script) return;
    setValidating(true);
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      setValidation(data);
    } catch (_) {
      toast.error('Validation request failed');
    } finally {
      setValidating(false);
    }
  }

  function handleCopy() {
    if (!script) return;
    navigator.clipboard.writeText(script).then(() => toast.success('Script copied!'));
  }

  function handleDownload() {
    if (!script) return;
    const blob = new Blob([script], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'mikrotik-block.rsc';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm"   onClick={handleCopy}     disabled={!script}>📋 Copy</button>
        <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={!script}>⬇️ Download .rsc</button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleValidate}
          disabled={!script || validating}
          style={{ borderColor: validation?.valid === false ? 'var(--danger)' : validation?.valid ? 'var(--success)' : undefined }}
        >
          {validating ? '⏳ Validating...' : '🔎 Validate Script'}
        </button>
        {previousScript && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowDiff(d => !d)}>
            {showDiff ? '▲ Hide Diff' : '▼ Show Diff'}
          </button>
        )}
      </div>

      {showDiff && previousScript && <ScriptDiff previous={previousScript} current={script} />}

      {validation && (
        <div style={{
          background: validation.valid ? 'rgba(76,175,125,0.08)' : 'rgba(224,82,82,0.08)',
          border: `1px solid ${validation.valid ? 'var(--success)' : 'var(--danger)'}`,
          borderRadius: '8px', padding: '0.75rem 1rem',
          fontSize: '0.82rem', marginBottom: '0.75rem',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: validation.valid ? 'var(--success)' : 'var(--danger)' }}>
            {validation.valid ? '✅ Script looks good' : '❌ Issues found'}
          </div>
          {(validation.errors || []).map((e, i) => (
            <div key={i} style={{ color: 'var(--danger)', marginBottom: '0.2rem' }}>
              ❌ <strong>{safeStr(e.code)}</strong>: {safeStr(e.message)}
            </div>
          ))}
          {(validation.warnings || []).map((w, i) => (
            <div key={i} style={{ color: 'var(--warning)', marginBottom: '0.2rem' }}>
              ⚠️ <strong>{safeStr(w.code)}</strong>: {safeStr(w.message)}
            </div>
          ))}
          {(validation.info || []).map((inf, i) => (
            <div key={i} style={{ color: 'var(--text-muted)' }}>
              ℹ️ {safeStr(inf.message)}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '3rem', textAlign: 'center',
          color: 'var(--text-muted)',
        }}>⏳ Resolving domains...</div>
      )}

      {!loading && script && (
        <pre style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '1.25rem',
          fontFamily: 'var(--mono)', fontSize: '0.78rem',
          color: 'var(--text)', overflowX: 'auto',
          whiteSpace: 'pre', maxHeight: '65vh', overflowY: 'auto',
          lineHeight: 1.6,
        }}>{script}</pre>
      )}

      {!loading && !script && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '3rem', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: '0.9rem',
        }}>📝 Resolve domains to generate RouterOS script</div>
      )}
    </div>
  );
}
