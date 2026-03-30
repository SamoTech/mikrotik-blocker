import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'mtblocker_presets';

// ─── Built-in factory presets (read-only, always shown first) ───────
const BUILTIN_PRESETS = [
  {
    id: 'cloudflare-doh',
    name: '☁️ Cloudflare (DoH Block)',
    description: 'Blocks Cloudflare 1.1.1.1 DoH resolver + AS13335 ranges',
    domains: ['cloudflare.com', '1.1.1.1', 'one.one.one.one', 'cloudflare-dns.com'],
    options: { addLayer7: true, includeIPv6: true, outputMode: 'both', addFilter: true },
  },
  {
    id: 'complete-block',
    name: '🔒 Complete Block (IPv6 + Layer7)',
    description: 'Enables all blocking methods — CIDR + IPs + IPv6 + Layer7 SNI',
    domains: [],
    options: { addLayer7: true, includeIPv6: true, outputMode: 'both', addFilter: true, addSrcBlock: false },
  },
  {
    id: 'social-media',
    name: '📱 Social Media Pack',
    description: 'Facebook, Instagram, TikTok, Snapchat, Twitter/X, Reddit',
    domains: ['facebook.com', 'instagram.com', 'tiktok.com', 'snapchat.com', 'twitter.com', 'x.com', 'reddit.com'],
    options: { addLayer7: false, includeIPv6: true, outputMode: 'cidr-only', addFilter: true },
  },
  {
    id: 'streaming',
    name: '🎬 Streaming Pack',
    description: 'YouTube, Netflix, Spotify, Twitch, Disney+',
    domains: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv', 'disneyplus.com'],
    options: { addLayer7: false, includeIPv6: true, outputMode: 'cidr-only', addFilter: true },
  },
];

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (_) { return {}; }
}
function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export default function PresetManager({ domains, options, onLoad }) {
  const [presets, setPresets]     = useState(loadPresets);
  const [newName, setNewName]     = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [tab, setTab]             = useState('builtin'); // 'builtin' | 'saved'

  useEffect(() => { savePresets(presets); }, [presets]);

  function handleSave() {
    const name = newName.trim();
    if (!name) return;
    const updated = { ...presets, [name]: { domains, options, savedAt: new Date().toISOString() } };
    setPresets(updated);
    setNewName('');
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
  }

  function handleDelete(name) {
    const updated = { ...presets };
    delete updated[name];
    setPresets(updated);
  }

  const presetList = Object.entries(presets);

  return (
    <div className="options-card">
      <h3>💾 Presets</h3>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
        {['builtin', 'saved'].map(t => (
          <button
            key={t}
            className={`toggle-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem 0' }}
          >
            {t === 'builtin' ? '⭐ Built-in' : `📂 My Presets (${presetList.length})`}
          </button>
        ))}
      </div>

      {/* ── BUILT-IN PRESETS ── */}
      {tab === 'builtin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {BUILTIN_PRESETS.map(p => (
            <div key={p.id} style={{
              background: 'var(--surface2)', borderRadius: '8px',
              padding: '0.5rem 0.65rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{p.description}</div>
                  {p.domains.length > 0 && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: '0.2rem' }}>
                      {p.domains.join(', ')}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onLoad(p.domains, p.options)}
                >Load</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SAVED PRESETS ── */}
      {tab === 'saved' && (
        <>
          {/* Save current */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              className="text-input"
              placeholder="Preset name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              {showSaved ? '✔ Saved' : 'Save'}
            </button>
          </div>

          {presetList.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No presets yet. Enter domains + options then save.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {presetList.map(([name, preset]) => (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--surface2)', borderRadius: '6px',
                  padding: '0.35rem 0.6rem', fontSize: '0.8rem',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {preset.domains?.length ?? 0} domain(s) · {preset.savedAt?.slice(0, 10)}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onLoad(preset.domains, preset.options)}
                  >Load</button>
                  <button
                    onClick={() => handleDelete(name)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                    }}
                    title="Delete preset"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
