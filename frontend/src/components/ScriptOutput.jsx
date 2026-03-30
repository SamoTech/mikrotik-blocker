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
  const [validating,     setValidating]     = useState(false);
  const [validation,     setValidation]     = useState(null);
  const [showDiff,       setShowDiff]       = useState(false);
  const [copied,         setCopied]         = useState(false);
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
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      toast.success('Script copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
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
    toast.success('Script downloaded!');
  }

  const lineCount = script ? script.split('\n').length : 0;
  const byteSize  = script ? new Blob([script]).size : 0;
  const sizeLabel = byteSize > 1024 ? `${(byteSize / 1024).toFixed(1)} KB` : `${byteSize} B`;

  return (
    <div>
      <div className="script-toolbar">
        <button
          className={`btn btn-sm ${copied ? 'btn-copied' : 'btn-primary'}`}
          onClick={handleCopy}
          disabled={!script}
          aria-label="Copy script to clipboard"
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleDownload}
          disabled={!script}
          aria-label="Download script as .rsc file"
        >
          ⬇️ Download .rsc
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleValidate}
          disabled={!script || validating}
          style={{
            borderColor: validation?.valid === false
              ? 'var(--danger)'
              : validation?.valid
              ? 'var(--success)'
              : undefined,
          }}
          aria-label="Validate script syntax"
        >
          {validating ? '⏳ Validating...' : '🔎 Validate'}
        </button>

        {previousScript && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDiff(d => !d)}
            aria-label={showDiff ? 'Hide diff' : 'Show diff'}
          >
            {showDiff ? '▲ Hide Diff' : '▼ Diff'}
          </button>
        )}

        {script && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {lineCount} lines · {sizeLabel}
          </span>
        )}
      </div>

      {showDiff && previousScript && <ScriptDiff previous={previousScript} current={script} />}

      {validation && (
        <div style={{
          background: validation.valid ? 'rgba(76,175,125,0.08)' : 'rgba(224,82,82,0.08)',
          border: `1px solid ${validation.valid ? 'var(--success)' : 'var(--danger)'}`,
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.82rem',
          marginBottom: '0.75rem',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: validation.valid ? 'var(--success)' : 'var(--danger)' }}>
            {validation.valid ? '✅ Script looks good' : '❌ Issues found'}
          </div>
          {(validation.errors   || []).map((e, i) => <div key={i} style={{ color: 'var(--danger)',   marginBottom: '0.2rem' }}>❌ <strong>{safeStr(e.code)}</strong>: {safeStr(e.message)}</div>)}
          {(validation.warnings || []).map((w, i) => <div key={i} style={{ color: 'var(--warning)',  marginBottom: '0.2rem' }}>⚠️ <strong>{safeStr(w.code)}</strong>: {safeStr(w.message)}</div>)}
          {(validation.info     || []).map((inf, i) => <div key={i} style={{ color: 'var(--text-muted)' }}>ℹ️ {safeStr(inf.message)}</div>)}
        </div>
      )}

      {!loading && script && (
        <pre
          className="script-pre"
          tabIndex={0}
          aria-label="Generated RouterOS script"
          aria-readonly="true"
        >{script}</pre>
      )}

      {!loading && !script && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '3rem',
          textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem',
        }}>
          📝 Resolve domains to generate RouterOS script
        </div>
      )}
    </div>
  );
}
