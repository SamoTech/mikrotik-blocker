import React, { useState } from 'react';
import toast from 'react-hot-toast';

function CopyBlock({ title, code, step, color = 'var(--primary)' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Step ${step} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div style={{
      background: 'var(--surface2)',
      border: `1px solid ${color}33`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '10px',
      marginBottom: '1.25rem',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.6rem 1rem',
        background: `${color}11`,
        borderBottom: `1px solid ${color}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            background: color,
            color: '#fff',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>{step}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'var(--success)' : color,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '0.85rem 1rem',
        fontFamily: 'var(--mono)',
        fontSize: '0.78rem',
        lineHeight: 1.8,
        color: 'var(--text)',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>{code}</pre>
    </div>
  );
}

function buildSteps(resolved, listName) {
  if (!resolved || resolved.length === 0) return [];

  // Step 1: Remove old entries
  const removeLines = resolved
    .map(r => `/ip firewall address-list remove [find list=${listName} comment="${r.domain}"]`)
    .join('\n');

  // Step 2: Add IPs
  const addLines = resolved
    .flatMap(r => {
      if (!r.ips || !r.ips.length) return [`# ⚠️ No IPs for ${r.domain}`];
      return r.ips.map(ip => `/ip firewall address-list add list=${listName} address=${ip} comment="${r.domain}"`);
    })
    .join('\n');

  // Step 3: Firewall rule
  const firewallCmd =
    `/ip firewall filter add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName}" place-before=0`;

  // Step 4: Verify
  const verifyLines = [
    `/ip firewall address-list print where list=${listName}`,
    `/ip firewall filter print where dst-address-list=${listName}`,
  ].join('\n');

  return [
    {
      step: 1,
      title: 'Remove old entries (clean update)',
      code: removeLines,
      color: 'var(--warning)',
      hint: 'Safe to skip on first run. Removes stale IPs for these domains.',
    },
    {
      step: 2,
      title: 'Add IP addresses to address list',
      code: addLines,
      color: 'var(--primary)',
      hint: 'Paste this block into your MikroTik terminal (Winbox, SSH, or WebFig).',
    },
    {
      step: 3,
      title: 'Add firewall drop rule',
      code: firewallCmd,
      color: 'var(--danger)',
      hint: 'Only run this once. Skip if rule already exists.',
    },
    {
      step: 4,
      title: 'Verify — confirm everything applied',
      code: verifyLines,
      color: 'var(--success)',
      hint: 'Run this to confirm IPs and rules are active on your router.',
    },
  ];
}

export default function ManualTerminal({ resolved, listName = 'blocked_sites' }) {
  const [copyAll, setCopyAll] = useState(false);

  if (!resolved || resolved.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🖥️</div>
        <p>Resolve domains first to get terminal commands</p>
      </div>
    );
  }

  const steps = buildSteps(resolved, listName);
  const allCode = steps.map(s => `# ── Step ${s.step}: ${s.title} ──\n${s.code}`).join('\n\n');

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allCode);
      setCopyAll(true);
      toast.success('All commands copied!');
      setTimeout(() => setCopyAll(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const totalIPs = resolved.reduce((acc, r) => acc + (r.ips?.length || 0), 0);

  return (
    <div>
      {/* Header bar */}
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '0.85rem 1.1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{resolved.length}</span> domain{resolved.length > 1 ? 's' : ''}
          &nbsp;→&nbsp;
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>{totalIPs}</span> IP{totalIPs !== 1 ? 's' : ''}
          &nbsp;→&nbsp;list:&nbsp;
          <code style={{ color: 'var(--warning)' }}>{listName}</code>
        </div>
        <button
          onClick={handleCopyAll}
          style={{
            background: copyAll ? 'var(--success)' : 'var(--surface)',
            color: copyAll ? '#fff' : 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '0.35rem 0.9rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copyAll ? '✅ All Copied!' : '📋 Copy All Steps'}
        </button>
      </div>

      {/* How to paste guide */}
      <div style={{
        background: 'rgba(91,141,239,0.07)',
        border: '1px solid rgba(91,141,239,0.25)',
        borderRadius: '10px',
        padding: '0.85rem 1.1rem',
        marginBottom: '1.25rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        lineHeight: 1.7,
      }}>
        <strong style={{ color: 'var(--primary)' }}>📡 How to apply on your MikroTik:</strong>
        <ol style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
          <li><strong>Winbox</strong> → New Terminal → paste commands</li>
          <li><strong>SSH</strong> → <code>ssh admin@192.168.88.1</code> → paste commands</li>
          <li><strong>WebFig</strong> → Terminal → paste commands</li>
          <li>Run steps <strong>in order: 1 → 2 → 3 → 4</strong></li>
        </ol>
      </div>

      {/* Steps */}
      {steps.map(s => (
        <div key={s.step}>
          <CopyBlock {...s} />
          <p style={{
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            marginTop: '-1rem',
            marginBottom: '1.25rem',
            paddingLeft: '0.5rem',
          }}>💡 {s.hint}</p>
        </div>
      ))}
    </div>
  );
}
