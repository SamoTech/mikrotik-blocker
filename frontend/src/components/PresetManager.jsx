import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'mtblocker_presets';

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
  const [open, setOpen]           = useState(false);

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

      {/* Saved presets */}
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
    </div>
  );
}
