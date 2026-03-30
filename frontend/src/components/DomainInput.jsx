import React from 'react';
import toast from 'react-hot-toast';

const DOMAIN_LIMIT = 10;

const PLACEHOLDER = `facebook.com
tiktok.com
youtube.com
instagram.com`;

export default function DomainInput({ onResolve, loading, value = '', onChange }) {

  const parseDomains = (text) =>
    text
      .split(/[\n,;\s]+/)
      .map(d => d.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase())
      .filter(d => d && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));

  const handleSubmit = (e) => {
    e.preventDefault();
    const domains = parseDomains(value);
    if (domains.length === 0) {
      toast.error('Please enter at least one valid domain');
      return;
    }
    if (domains.length > DOMAIN_LIMIT) {
      toast.error(`Only the first ${DOMAIN_LIMIT} domains will be processed. ${domains.length - DOMAIN_LIMIT} will be ignored.`, { duration: 5000 });
    }
    onResolve(domains);
  };

  const handlePasteExample = () => {
    onChange(PLACEHOLDER);
  };

  const preview   = parseDomains(value);
  const overLimit = preview.length > DOMAIN_LIMIT;

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
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          style={{
            width: '100%',
            background: 'var(--surface2)',
            border: `1px solid ${overLimit ? '#f0a500' : 'var(--border)'}`,
            borderRadius: '8px',
            color: 'var(--text)',
            padding: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'var(--mono)',
            resize: 'vertical',
            lineHeight: 1.6,
            transition: 'border-color 0.2s',
          }}
        />

        {/* Domain count + over-limit warning */}
        {preview.length > 0 && (
          <div style={{ marginTop: '0.4rem' }}>
            <p style={{
              fontSize: '0.78rem',
              color: overLimit ? '#f0a500' : 'var(--text-muted)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}>
              {overLimit ? '⚠️' : '✓'}
              {preview.length} domain{preview.length > 1 ? 's' : ''} detected
              {overLimit && (
                <span style={{
                  background: 'rgba(240,165,0,0.12)',
                  border: '1px solid rgba(240,165,0,0.35)',
                  borderRadius: '4px',
                  padding: '0.05rem 0.45rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}>
                  limit {DOMAIN_LIMIT} — only first {DOMAIN_LIMIT} will be used
                </span>
              )}
            </p>

            {overLimit && (
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                margin: '0.3rem 0 0',
                lineHeight: 1.5,
              }}>
                Domains that will be <strong style={{ color: 'var(--text)' }}>ignored</strong>:{' '}
                <span style={{ fontFamily: 'var(--mono)', color: '#e05252' }}>
                  {preview.slice(DOMAIN_LIMIT).join(', ')}
                </span>
              </p>
            )}
          </div>
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
