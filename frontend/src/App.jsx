import React, { useState, useCallback, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import DomainInput from './components/DomainInput';
import ScriptOutput from './components/ScriptOutput';
import SchedulerPanel from './components/SchedulerPanel';
import MikroTikPush from './components/MikroTikPush';
import useResolver from './hooks/useResolver';
import './App.css';

export default function App() {
  const [listName, setListName] = useState('blocked_sites');
  const [addFirewallRule, setAddFirewallRule] = useState(true);
  const { resolved, script, loading, error, resolve } = useResolver();
  const [activeTab, setActiveTab] = useState('script');

  const handleResolve = useCallback((domains) => {
    resolve(domains, { listName, addFirewallRule });
  }, [resolve, listName, addFirewallRule]);

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1d2e', color: '#e8eaf6', border: '1px solid #2e3150' } }} />

      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🔒</span>
            <div>
              <h1>MikroTik Blocker</h1>
              <p>Block domains via RouterOS address lists</p>
            </div>
          </div>
          <div className="header-badges">
            <span className="badge">RouterOS CLI</span>
            <span className="badge badge-green">DNS Auto-Resolve</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <DomainInput onResolve={handleResolve} loading={loading} />

          <div className="options-card">
            <h3>⚙️ Script Options</h3>
            <div className="option-row">
              <label>Address List Name</label>
              <input
                type="text"
                value={listName}
                onChange={e => setListName(e.target.value)}
                placeholder="blocked_sites"
                className="text-input"
              />
            </div>
            <div className="option-row">
              <label>
                <input
                  type="checkbox"
                  checked={addFirewallRule}
                  onChange={e => setAddFirewallRule(e.target.checked)}
                />
                &nbsp;Add firewall drop rule
              </label>
            </div>
          </div>

          <SchedulerPanel onResolve={handleResolve} />
        </div>

        <div className="right-panel">
          {error && <div className="error-banner">⚠️ {error}</div>}

          {resolved.length > 0 && (
            <div className="resolved-summary">
              <h3>📌 Resolved IPs</h3>
              <div className="domain-chips">
                {resolved.map(r => (
                  <div key={r.domain} className={`domain-chip ${r.error ? 'chip-error' : 'chip-ok'}`}>
                    <strong>{r.domain}</strong>
                    {r.error
                      ? <span className="chip-detail error">❌ {r.error}</span>
                      : <span className="chip-detail">{r.ips.length} IP{r.ips.length !== 1 ? 's' : ''}: {r.ips.join(', ')}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tab-bar">
            <button className={`tab-btn ${activeTab === 'script' ? 'active' : ''}`} onClick={() => setActiveTab('script')}>📜 Script</button>
            <button className={`tab-btn ${activeTab === 'push' ? 'active' : ''}`} onClick={() => setActiveTab('push')}>🚀 API Push</button>
          </div>

          {activeTab === 'script' && <ScriptOutput script={script} loading={loading} />}
          {activeTab === 'push' && <MikroTikPush script={script} />}
        </div>
      </main>
    </div>
  );
}
