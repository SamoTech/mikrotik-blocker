import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DomainInput    from './components/DomainInput';
import ScriptOutput   from './components/ScriptOutput';
import ManualTerminal from './components/ManualTerminal';
import SchedulerPanel from './components/SchedulerPanel';
import StatsBar       from './components/StatsBar';
import Footer         from './components/Footer';
import PresetManager  from './components/PresetManager';
import FileImport     from './components/FileImport';
import ThemeToggle, { useTheme } from './components/ThemeToggle';
import useResolver    from './hooks/useResolver';

import SponsorsPage  from './pages/SponsorsPage';
import ChangelogPage from './pages/ChangelogPage';
import LicensePage   from './pages/LicensePage';
import PrivacyPage   from './pages/PrivacyPage';
import TermsPage     from './pages/TermsPage';
import ApiDocs       from './pages/ApiDocs';

import './App.css';

// ─── ASN shared-infrastructure warnings ─────────────────────────────────────
const SHARED_ASN_WARNINGS = {
  '15169': {
    platforms: ['youtube.com','google.com','googleapis.com','googlevideo.com','gstatic.com','googleusercontent.com'],
    message: 'AS15169 (Google) — Blocking these IP ranges will also affect Gmail, Drive, Meet, Search, Maps, and Android updates. Consider DNS + Layer7 blocking instead.',
    color: '#f0a500',
  },
  '16509': {
    platforms: ['amazonaws.com','cloudfront.net','primevideo.com'],
    message: 'AS16509 (Amazon AWS) — Blocking AWS ranges will break thousands of unrelated websites hosted on AWS, not just Amazon/Prime Video.',
    color: '#f0a500',
  },
  '46489': {
    platforms: ['twitch.tv','epicgames.com','twitchsvc.net'],
    message: 'AS46489 (Fastly CDN) — This ASN is shared between Twitch, Epic Games, and many other CDN-hosted sites.',
    color: '#f0a500',
  },
};

const DOMAIN_ASN_LOOKUP = {};
for (const [asn, info] of Object.entries(SHARED_ASN_WARNINGS)) {
  for (const platform of info.platforms) {
    DOMAIN_ASN_LOOKUP[platform] = { asn, ...info };
  }
}

function matchesWarnedDomain(d) {
  return Object.keys(DOMAIN_ASN_LOOKUP).find(p => d === p || d.endsWith('.' + p));
}

function getWarnings(domains) {
  const warnings = [];
  const triggeredAsns = new Map();
  for (const d of domains) {
    const key = matchesWarnedDomain(d);
    if (!key) continue;
    const { asn } = DOMAIN_ASN_LOOKUP[key];
    if (!triggeredAsns.has(asn)) triggeredAsns.set(asn, []);
    triggeredAsns.get(asn).push(d);
  }
  for (const [asn, matched] of triggeredAsns) {
    const info = SHARED_ASN_WARNINGS[asn];
    warnings.push({ type: 'asn', color: info.color, message: info.message });
    if (matched.length > 1) {
      warnings.push({
        type: 'duplicate-asn',
        color: '#5b8def',
        message: `These domains share AS${asn}: ${matched.join(', ')} — the script will contain duplicate IP ranges. Consider keeping only one.`,
      });
    }
  }
  return warnings;
}

// ─── Warning banner ────────────────────────────────────────────────────────
function WarningBanner({ warnings }) {
  if (!warnings.length) return null;
  return (
    <div className="warning-stack" role="alert" aria-label="Domain warnings">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="warning-item"
          style={{ border: `1px solid ${w.color}`, background: `${w.color}18`, borderRadius: '8px' }}
        >
          <span className="warning-icon">{w.type === 'asn' ? '⚠️' : 'ℹ️'}</span>
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Unified Info Panel (Getting Started + Known Limitations side-by-side) ─
const STEPS = [
  { num: '1', text: 'Enter domain names in the Domain Input box' },
  { num: '2', text: 'Configure options in Script Options' },
  { num: '3', text: <>Click <strong>Generate Script</strong> or press <kbd className="kbd">Ctrl+Enter</kbd></> },
  { num: '4', text: 'Copy and paste into your MikroTik terminal' },
];

const LIMITATIONS = [
  { icon: '🔓', text: 'Clients using DoH (DNS-over-HTTPS) bypass DNS-based rules — IP range blocks + Layer7 SNI still apply.' },
  { icon: '🔐', text: 'TLS 1.3 ESNI/ECH makes Layer7 SNI matching unreliable on modern browsers.' },
  { icon: '📱', text: 'Certificate-pinned apps (WhatsApp, Instagram) cannot be inspected via NGFW/MiTM.' },
  { icon: '🔄', text: 'IP ranges rotate over time — re-run the tool periodically or use the Auto-Refresh scheduler.' },
  { icon: '📶', text: 'Motivated users on mobile data (LTE/5G) are outside this tool\'s threat model.' },
];

function InfoPanel() {
  return (
    <div className="info-panel" role="region" aria-label="Getting started and known limitations">
      {/* ── Left: Getting Started ── */}
      <div className="info-panel-col">
        <div className="info-panel-header">
          <span className="info-panel-icon">🔒</span>
          <div>
            <div className="info-panel-title">Generate your RouterOS block script</div>
            <div className="info-panel-sub">Enter domains and click <strong>Generate Script</strong> to create a ready-to-paste RouterOS script.</div>
          </div>
        </div>
        <div className="info-steps">
          {STEPS.map(s => (
            <div key={s.num} className="info-step">
              <span className="info-step-num">{s.num}</span>
              <span className="info-step-text">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="info-panel-divider" aria-hidden />

      {/* ── Right: Known Limitations ── */}
      <div className="info-panel-col">
        <div className="info-panel-header">
          <span className="info-panel-icon">⚠️</span>
          <div>
            <div className="info-panel-title">Known Limitations</div>
            <div className="info-panel-sub">Understand the boundaries of IP/DNS blocking before deploying.</div>
          </div>
        </div>
        <table className="info-limits-table" aria-label="Known limitations">
          <tbody>
            {LIMITATIONS.map((l, i) => (
              <tr key={i}>
                <td className="info-limits-icon" aria-hidden>{l.icon}</td>
                <td className="info-limits-text">{l.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────
function ProgressBar() {
  return (
    <div className="progress-bar-wrap" role="progressbar" aria-label="Resolving domains">
      <div className="progress-bar-fill" />
    </div>
  );
}

// ─── Accordion wrapper ────────────────────────────────────────────────────
function Accordion({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);
  const [height, setHeight] = useState('auto');
  useEffect(() => {
    if (bodyRef.current) setHeight(bodyRef.current.scrollHeight + 'px');
  }, [children, open]);

  return (
    <div className="options-card" style={{ paddingBottom: open ? '1.1rem' : '0.1rem' }}>
      <div
        className="accordion-header"
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(o => !o)}
      >
        <h3 style={{ marginBottom: 0 }}>{title}</h3>
        <span className={`accordion-chevron ${open ? 'open' : ''}`} aria-hidden>▼</span>
      </div>
      <div
        ref={bodyRef}
        className={`accordion-body ${open ? 'expanded' : 'collapsed'}`}
        style={{ maxHeight: open ? height : '0' }}
        aria-hidden={!open}
      >
        <div style={{ paddingTop: '0.75rem' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────
function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();

  const [listName,     setListName]     = useState('blocked');
  const [outputMode,   setOutputMode]   = useState('both');
  const [addFilter,    setAddFilter]    = useState(true);
  const [addSrcBlock,  setAddSrcBlock]  = useState(false);
  const [includeIPv6,  setIncludeIPv6]  = useState(true);
  const [addLayer7,    setAddLayer7]    = useState(false);
  const [routerOS,     setRouterOS]     = useState('v7');
  const [domainsValue, setDomainsValue] = useState('');
  const [activeTab,    setActiveTab]    = useState('terminal');
  const [activeCategory, setActiveCategory] = useState(null);

  const { resolved, script, stats, loading, error, resolve } = useResolver();

  const currentOptions = { listName, outputMode, addFilter, addSrcBlock, includeIPv6, addLayer7, routerOS };
  const parsedDomains  = domainsValue.split('\n').map(d => d.trim()).filter(Boolean);
  const warnings       = getWarnings(parsedDomains);
  const hasResults     = resolved.length > 0 || !!script;

  const handleResolve = useCallback((domains, category = null) => {
    resolve(domains, { ...currentOptions, category });
  }, [resolve, listName, outputMode, addFilter, addSrcBlock, includeIPv6, addLayer7, routerOS]);

  const handleCategory = (cat) => {
    setActiveCategory(cat);
    resolve([], { ...currentOptions, category: cat });
  };

  const handleLoadPreset = (domains, opts) => {
    if (opts.listName    !== undefined) setListName(opts.listName);
    if (opts.outputMode  !== undefined) setOutputMode(opts.outputMode);
    if (opts.addFilter   !== undefined) setAddFilter(opts.addFilter);
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

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (parsedDomains.length > 0 && !loading) handleResolve(parsedDomains);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [parsedDomains, loading, handleResolve]);

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
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: '#fff' } },
        }}
      />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo" role="banner" aria-label="MikroTik Blocker">
            <span className="logo-icon" aria-hidden>🔒</span>
            <div>
              <h1>MikroTik Blocker</h1>
              <p>Block domains via RouterOS address lists</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-badges" aria-label="Features">
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

        {/* ── TOP: config-zone ── */}
        <div className="config-zone">
          <div className="input-col">
            <DomainInput
              onResolve={handleResolve}
              loading={loading}
              value={domainsValue}
              onChange={setDomainsValue}
            />

            {warnings.length > 0 && <WarningBanner warnings={warnings} />}

            <FileImport onImport={handleFileImport} />

            <Accordion title="📦 Category Blocklists" defaultOpen={false}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Fetch domain lists from oisd.nl and StevenBlack hosts
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    style={activeCategory === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
                    onClick={() => handleCategory(cat.id)}
                    disabled={loading}
                    aria-pressed={activeCategory === cat.id}
                  >
                    {loading && activeCategory === cat.id ? '⏳ Fetching...' : cat.label}
                  </button>
                ))}
              </div>
            </Accordion>

            <PresetManager
              domains={parsedDomains}
              options={currentOptions}
              onLoad={handleLoadPreset}
            />

            <SchedulerPanel onResolve={handleResolve} />
          </div>

          <div className="options-col">
            <Accordion title="⚙️ Script Options" defaultOpen={true}>
              <div className="option-row">
                <label htmlFor="listNameInput">Address List Name</label>
                <input
                  id="listNameInput"
                  type="text"
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  placeholder="blocked"
                  className="text-input"
                  aria-label="Address list name"
                />
              </div>

              <div className="option-row">
                <label>RouterOS Version</label>
                <div className="toggle-group" role="group" aria-label="RouterOS version">
                  {['v6', 'v7'].map(v => (
                    <button
                      key={v}
                      className={`toggle-btn ${routerOS === v ? 'active' : ''}`}
                      onClick={() => setRouterOS(v)}
                      aria-pressed={routerOS === v}
                    >{v}</button>
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {routerOS === 'v7'
                    ? '/ip/firewall (slash — v7 also accepts /ip firewall space syntax)'
                    : '/ip firewall (space syntax — legacy RouterOS v6)'}
                </span>
              </div>

              <div className="option-row">
                <label>Output Mode</label>
                <div className="toggle-group" role="group" aria-label="Output mode">
                  {OUTPUT_MODES.map(m => (
                    <button
                      key={m.id}
                      className={`toggle-btn ${outputMode === m.id ? 'active' : ''}`}
                      onClick={() => setOutputMode(m.id)}
                      title={m.hint}
                      aria-pressed={outputMode === m.id}
                    >{m.label}</button>
                  ))}
                </div>
              </div>

              <div className="option-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={addFilter} onChange={e => setAddFilter(e.target.checked)} aria-label="Add firewall drop rule" />
                  Add firewall drop rule
                </label>
              </div>
              <div className="option-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={addSrcBlock} onChange={e => setAddSrcBlock(e.target.checked)} aria-label="Also block inbound src" />
                  Also block inbound (src)
                </label>
              </div>
              <div className="option-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={includeIPv6} onChange={e => setIncludeIPv6(e.target.checked)} aria-label="Include IPv6" />
                  Include IPv6 (AAAA + /ipv6)
                </label>
              </div>

              <div className={`layer7-option ${addLayer7 ? 'active' : ''}`}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addLayer7}
                    onChange={e => setAddLayer7(e.target.checked)}
                    aria-label="Enable Layer7 Protocol Block"
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: addLayer7 ? 'var(--danger)' : 'var(--text)', fontSize: '0.84rem' }}>
                      🔍 Layer7 Protocol Block
                    </div>
                    <div className="checkbox-hint">
                      Matches HTTP Host header + TLS SNI.<br />
                      <span style={{ color: 'var(--warning)' }}>⚠️ High CPU on large traffic — edge/border router only.</span>
                    </div>
                  </div>
                </label>
              </div>
            </Accordion>
          </div>
        </div>
        {/* end config-zone */}

        {/* ── BOTTOM: output zone ── */}
        <div className="output-zone">

          {/* Unified info panel — only before first result */}
          {!hasResults && !loading && <InfoPanel />}

          {loading && <ProgressBar />}
          {error   && <div className="error-banner" role="alert">⚠️ {error}</div>}
          {stats   && <StatsBar stats={stats} />}

          {resolved.length > 0 && (
            <div className="resolved-summary" aria-live="polite">
              <h3>📌 Resolved Results</h3>
              <div className="domain-chips">
                {resolved.map(r => (
                  <div key={r.domain} className={`domain-chip ${r.error ? 'chip-error' : 'chip-ok'}`}>
                    <div className="chip-header">
                      <span className="chip-domain">{r.domain}</span>
                      {r.method && (
                        <span className={`chip-method ${r.method === 'ASN+DNS' ? 'chip-method-asn' : 'chip-method-dns'}`}>
                          {r.method}
                        </span>
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

          {hasResults && (
            <div className="tab-bar" role="tablist" aria-label="Output format">
              <button
                className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
                onClick={() => setActiveTab('terminal')}
                role="tab"
                aria-selected={activeTab === 'terminal'}
              >🖥️ Terminal (interactive)</button>
              <button
                className={`tab-btn ${activeTab === 'script' ? 'active' : ''}`}
                onClick={() => setActiveTab('script')}
                role="tab"
                aria-selected={activeTab === 'script'}
              >📜 Script (.rsc file)</button>
            </div>
          )}

          {loading && (
            <div className="skeleton-block">
              {[100,85,70,90,60].map((w, i) => (
                <div key={i} className="skeleton skeleton-line" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {hasResults && activeTab === 'terminal' && (
            <ManualTerminal resolved={resolved} listName={listName} includeIPv6={includeIPv6} addLayer7={addLayer7} routerOS={routerOS} />
          )}
          {hasResults && activeTab === 'script' && (
            <ScriptOutput script={script} loading={loading} />
          )}

        </div>
        {/* end output-zone */}

      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<HomePage />} />
      <Route path="/sponsors"  element={<SponsorsPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
      <Route path="/license"   element={<LicensePage />} />
      <Route path="/privacy"   element={<PrivacyPage />} />
      <Route path="/terms"     element={<TermsPage />} />
      <Route path="/docs"      element={<ApiDocs />} />
      <Route path="*"          element={<HomePage />} />
    </Routes>
  );
}
