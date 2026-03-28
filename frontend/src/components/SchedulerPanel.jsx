import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function SchedulerPanel({ onResolve }) {
  const [enabled, setEnabled] = useState(false);
  const [intervalHours, setIntervalHours] = useState(6);
  const [domainsRaw, setDomainsRaw] = useState('');
  const [lastRun, setLastRun] = useState(null);
  const [nextRun, setNextRun] = useState(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const [countdown, setCountdown] = useState('');

  const parseDomains = (text) =>
    text.split(/[\n,;\s]+/).map(d => d.trim().toLowerCase()).filter(Boolean);

  const scheduleRun = () => {
    const domains = parseDomains(domainsRaw);
    if (!domains.length) { toast.error('Enter domains for scheduler'); return; }
    const run = () => {
      onResolve(domains);
      const now = new Date();
      setLastRun(now.toLocaleTimeString());
      const next = new Date(now.getTime() + intervalHours * 3600000);
      setNextRun(next);
    };
    run();
    timerRef.current = setInterval(run, intervalHours * 3600000);
    setEnabled(true);
    toast.success(`⏰ Scheduler started — every ${intervalHours}h`);
  };

  const stopScheduler = () => {
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    setEnabled(false);
    setNextRun(null);
    setCountdown('');
    toast('Scheduler stopped');
  };

  useEffect(() => {
    if (!enabled || !nextRun) return;
    countdownRef.current = setInterval(() => {
      const diff = nextRun - new Date();
      if (diff <= 0) { setCountdown('Running...'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [enabled, nextRun]);

  return (
    <div className="card">
      <h3>⏰ Auto-Refresh Scheduler</h3>

      <div className="option-row">
        <label>Domains to watch</label>
        <textarea
          value={domainsRaw}
          onChange={e => setDomainsRaw(e.target.value)}
          placeholder="facebook.com&#10;tiktok.com"
          rows={3}
          style={{
            width: '100%',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            padding: '0.5rem',
            fontSize: '0.82rem',
            fontFamily: 'var(--mono)',
            resize: 'vertical',
          }}
          disabled={enabled}
        />
      </div>

      <div className="option-row">
        <label>Refresh interval</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            value={intervalHours}
            min={1}
            max={168}
            onChange={e => setIntervalHours(Number(e.target.value))}
            className="text-input"
            style={{ width: '80px' }}
            disabled={enabled}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>hours</span>
        </div>
      </div>

      {enabled && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', background: 'var(--surface2)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
          <div>✅ Last run: {lastRun}</div>
          <div>⏳ Next run in: <strong style={{ color: 'var(--primary)' }}>{countdown}</strong></div>
        </div>
      )}

      <button
        className={`btn ${enabled ? 'btn-danger' : 'btn-success'}`}
        style={{ width: '100%' }}
        onClick={enabled ? stopScheduler : scheduleRun}
      >
        {enabled ? '⏹ Stop Scheduler' : '▶️ Start Scheduler'}
      </button>
    </div>
  );
}
