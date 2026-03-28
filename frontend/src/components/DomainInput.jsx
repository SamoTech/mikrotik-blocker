import React, { useState } from 'react';
import toast from 'react-hot-toast';

const PLACEHOLDER = `facebook.com
tiktok.com
youtube.com
instagram.com`;

export default function DomainInput({ onResolve, loading }) {
  const [raw, setRaw] = useState('');

  const parseDomains = (text) =>
    text
      .split(/[\n,;\s]+/)
      .map(d => d.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase())
      .filter(d => d && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));

  const handleSubmit = (e) => {
    e.preventDefault();
    const domains = parseDomains(raw);
    if (domains.length === 0) {
      toast.error('Please enter at least one valid domain');
      return;
    }
    onResolve(domains);
  };

  const handlePasteExample = () => {
    setRaw(PLACEHOLDER);
  };

  const preview = parseDomains(raw);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>🌐 Domain Input</h3>
        <button className="btn btn-secondary btn-sm" onClick={handlePasteExample} type="button">
          Load Example
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          style={{
            width: '100%',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            padding: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'var(--mono)',
            resize: 'vertical',
            lineHeight: 1.6,
          }}
        />
        {preview.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            ✓ {preview.length} domain{preview.length > 1 ? 's' : ''} detected
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ marginTop: '0.75rem', width: '100%' }}
        >
          {loading ? '⏳ Resolving...' : '🔍 Resolve & Generate Script'}
        </button>
      </form>
    </div>
  );
}
