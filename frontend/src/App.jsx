import React, { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import DomainInput from './components/DomainInput';
import ScriptOutput from './components/ScriptOutput';
import ManualTerminal from './components/ManualTerminal';
import SchedulerPanel from './components/SchedulerPanel';
import StatsBar from './components/StatsBar';
import Footer from './components/Footer';
import PresetManager from './components/PresetManager';
import FileImport from './components/FileImport';
import ThemeToggle, { useTheme } from './components/ThemeToggle';
import useResolver from './hooks/useResolver';
import './App.css';

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();

  const [listName, setListName]       = useState('blocked');
  const [outputMode, setOutputMode]   = useState('both');
  const [addFilter, setAddFilter]     = useState(true);
  const [addSrcBlock, setAddSrcBlock] = useState(false);
  const [includeIPv6, setIncludeIPv6] = useState(true);
  const [addLayer7, setAddLayer7]     = useState(false);
  const [routerOS, setRouterOS]       = useState('v7');
  const [domainsValue, setDomainsValue] = useState('');
  const [activeTab, setActiveTab]     = useState('terminal');
  const [activeCategory, setActiveCategory] = useState(null);

  const { resolved, script, stats, loading, error, resolve } = useResolver();

  const currentOptions = { listName, outputMode, addFilter, addSrcBlock, includeIPv6, addLayer7, routerOS };

  const handleResolve = useCallback((domains, category = null) => {
    resolve(domains, { ...currentOptions, category });
  }, [resolve, listName, outputMode, addFilter, addSrcBlock, includeIPv6, addLayer7, routerOS]);

  const handleCategory = (cat) => {
    setActiveCategory(cat);
    resolve([], { ...currentOptions, category: cat });
  };

  const handleLoadPreset = (domains, opts) => {
    if (opts.listName   !== undefined) setListName(opts.listName);
    if (opts.outputMode !== undefined) setOutputMode(opts.outputMode);
    if (opts.addFilter  !== undefined) setAddFilter(opts.addFilter);
    if (opts.addSrcBlock !== undefined) setAddSrcBlock(opts.addSrcBlock);
    if (opts.includeIPv6 !== undefined) setIncludeIPv6(opts.includeIPv6);
    if (opts.addLayer7   !== undefined) setAddLayer7(opts.addLayer7);
    if (opts.routerOS    !== undefined) setRouterOS(opts.routerOS);
    if (domains?.length) setDomainsValue(domains.join('\n'));
  };

  const handleFileImport = (domains) => {
    setDomainsValue(prev => {
      const existing = prev.split('\n').map(d => d.trim()).filter(Boolean);
      return [...new Set([...existing, ...domains])].join('\n');
    });
  };

  const CATEGORIES = [
    { id: 'ads',     label: '🚦 Ads & Tracking',  color: '#f0a500' },
    { id: 'adult',   label: '🔞 Adult Content',    color: '#e05252' },
    { id: 'malware', label: '☠️ Malware/Phishing', color: '#9b59b6' },
  ];

  const OUTPUT_MODES = [
    { id: 'both',      label: '◑ Both',      hint: 'CIDR + IPs' },
    { id: 'cidr-only', label: '📊 CIDR Only', hint: 'ASN ranges only' },
    { id: 'ips-only',  label: '🔵 IPs Only',  hint: 'DNS resolved IPs' },
  ];

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }
      }} />

      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🔒</span>
            <div>
              <h1>MikroTik Blocker</h1>
              <p>Block domains via RouterOS address lists</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="header-badges">
              <span className="badge">RouterOS CLI</span>
              <span className="badge badge-green">DNS Auto-Resolve</span>
              <span className="badge badge-purple">ASN CIDR</span>
              <span className="badge badge-orange">IPv6</span>
              <span className="badge badge-red">Layer7</span>
            </div>
            <ThemeToggle theme={theme} toggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <DomainInput
            onResolve={handleResolve}
            loading={loading}
            value={domainsValue}
            onChange={setDomainsValue}
          />
          <FileImport onImport={handleFileImport} />

          <div className="options-card" style={{ marginTop: '0.75rem' }}>
            <h3>📦 Category Blocklists</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Fetch domain lists from oisd.nl and StevenBlack hosts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className="btn btn-secondary"
                  style={{
                    borderColor: activeCategory === cat.id ? cat.color : undefined,
                    color:       activeCategory === cat.id ? cat.color : undefined,
                    textAlign: 'left',
                    opacity: loading ? 0.5 : 1,
                  }}
                  onClick={() => handleCategory(cat.id)}
                  disabled={loading}
                >
                  {loading && activeCategory === cat.id ? '⏳ Fetching...' : cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="options-card">
            <h3>⚙️ Script Options</h3>

            <div className="option-row">
              <label>Address List Name</label>
              <input
                type="text"
                value={listName}
                onChange={e => setListName(e.target.value)}
                placeholder="blocked"
                className="text-input"
              />
            </div>

            <div className="option-row">
              <label>RouterOS Version</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['v6', 'v7'].map(v => (
                  <button
                    key={v}
                    onClick={() => setRouterOS(v)}
                    style={{
                      padding: '0.3rem 0.9rem',
                      borderRadius: '6px',
                      border: `1px solid ${routerOS === v ? 'var(--primary)' : 'var(--border)'}`,
                      background: routerOS === v ? 'var(--primary)' : 'var(--surface2)',
                      color: routerOS === v ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.8rem', cursor: 'pointer',
                      fontWeight: routerOS === v ? 700 : 400,
                    }}
                  >{v}</button>
                ))}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {routerOS === 'v7' ? '/ip/firewall (slash path)' : '/ip firewall (space path)'}
              </span>
            </div>

            <div className="option-row">
              <label>Output Mode</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {OUTPUT_MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setOutputMode(m.id)}
                    title={m.hint}
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: '6px',
                      border: `1px solid ${outputMode === m.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: outputMode === m.id ? 'var(--primary)' : 'var(--surface2)',
                      color: outputMode === m.id ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.78rem', cursor: 'pointer',
                      fontWeight: outputMode === m.id ? 600 : 400,
                    }}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <div className="option-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={addFilter}   onChange={e => setAddFilter(e.target.checked)} />
                Add firewall drop rule
              </label>
            </div>
            <div className="option-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={addSrcBlock} onChange={e => setAddSrcBlock(e.target.checked)} />
                Also block inbound (src)
              </label>
            </div>
            <div className="option-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={includeIPv6} onChange={e => setIncludeIPv6(e.target.checked)} />
                Include IPv6 (AAAA + /ipv6)
              </label>
            </div>

            <div className="option-row" style={{
              marginTop: '0.5rem', padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              background: addLayer7 ? 'rgba(224,82,82,0.08)' : 'transparent',
              border: `1px solid ${addLayer7 ? '#e05252' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={addLayer7} onChange={e => setAddLayer7(e.target.checked)} style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: addLayer7 ? '#e05252' : 'var(--text)', fontSize: '0.85rem' }}>
                    🔍 Layer7 Protocol Block
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                    Matches HTTP Host header + TLS SNI — blocks domain by name regardless of IP changes.
                    <br />
                    <span style={{ color: '#f0a500' }}>⚠️ High CPU on large traffic — use on edge/border router only.</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <PresetManager
            domains={domainsValue.split('\n').map(d => d.trim()).filter(Boolean)}
            options={currentOptions}
            onLoad={handleLoadPreset}
          />

          <SchedulerPanel onResolve={handleResolve} />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          {error && <div className="error-banner">⚠️ {error}</div>}
          {stats && <StatsBar stats={stats} />}

          {resolved.length > 0 && (
            <div className="resolved-summary">
              <h3>📌 Resolved Results</h3>
              <div className="domain-chips">
                {resolved.map(r => (
                  <div key={r.domain} className={`domain-chip ${r.error ? 'chip-error' : 'chip-ok'}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{r.domain}</strong>
                      {r.method && (
                        <span style={{
                          fontSize: '0.68rem',
                          background: r.method === 'ASN+DNS' ? 'rgba(91,141,239,0.15)' : 'rgba(76,175,125,0.15)',
                          color: r.method === 'ASN+DNS' ? 'var(--primary)' : 'var(--success)',
                          padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600,
                        }}>{r.method}</span>
                      )}
                    </div>
                    {r.error
                      ? <span className="chip-detail error">❌ {r.error}</span>
                      : (
                        <span className="chip-detail">
                          {r.cidrs?.length   > 0 && `📊 ${r.cidrs.length} CIDR  `}
                          {r.cidrsV6?.length > 0 && `🟣 ${r.cidrsV6.length} CIDRv6  `}
                          {r.ips?.length     > 0 && `🔵 ${r.ips.length} IPv4  `}
                          {r.ipsV6?.length   > 0 && `🟢 ${r.ipsV6.length} IPv6  `}
                          {r.layer7Regex         && `🔍 L7`}
                        </span>
                      )
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tab-bar">
            <button className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`} onClick={() => setActiveTab('terminal')}>🖥️ Terminal</button>
            <button className={`tab-btn ${activeTab === 'script'   ? 'active' : ''}`} onClick={() => setActiveTab('script')}>📜 Script (.rsc)</button>
          </div>

          {activeTab === 'terminal' && <ManualTerminal resolved={resolved} listName={listName} includeIPv6={includeIPv6} addLayer7={addLayer7} routerOS={routerOS} />}
          {activeTab === 'script'   && <ScriptOutput script={script} loading={loading} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
