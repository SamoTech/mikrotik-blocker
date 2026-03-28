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
    } catch { toast.error('Copy failed'); }
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
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.6rem 1rem', background: `${color}11`,
        borderBottom: `1px solid ${color}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            background: color, color: '#fff', borderRadius: '50%',
            width: '22px', height: '22px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
          }}>{step}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        </div>
        <button onClick={handleCopy} style={{
          background: copied ? 'var(--success)' : color,
          color: '#fff', border: 'none', borderRadius: '6px',
          padding: '0.3rem 0.8rem', fontSize: '0.78rem', fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap',
        }}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
      </div>
      <pre style={{
        margin: 0, padding: '0.85rem 1rem',
        fontFamily: 'var(--mono)', fontSize: '0.78rem', lineHeight: 1.8,
        color: 'var(--text)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{code}</pre>
    </div>
  );
}

function buildSteps(resolved, listName, includeIPv6) {
  if (!resolved?.length) return [];

  // Step 1: Remove
  const removeLines = resolved.flatMap(r => {
    const lines = [`/ip firewall address-list remove [find list=${listName} comment~"${r.domain}"]`];
    if (includeIPv6 && (r.cidrsV6?.length || r.ipsV6?.length))
      lines.push(`/ipv6 firewall address-list remove [find list=${listName} comment~"${r.domain}"]`);
    return lines;
  }).join('\n');

  // Step 2a: IPv4
  const addIPv4 = resolved.flatMap(r => {
    const lines = [];
    if (!r.domain) return lines;
    if (r.cidrs?.length) {
      lines.push(`# ${r.domain} — CIDR ranges`);
      r.cidrs.forEach(({ cidr }) => lines.push(`/ip firewall address-list add list=${listName} address=${cidr} comment="${r.domain}-range"`));
    }
    if (r.ips?.length) {
      lines.push(`# ${r.domain} — IPv4`);
      r.ips.forEach(ip => lines.push(`/ip firewall address-list add list=${listName} address=${ip} comment="${r.domain}-ip"`));
    }
    return lines;
  }).join('\n');

  // Step 2b: IPv6
  const addIPv6Lines = resolved.flatMap(r => {
    const lines = [];
    if (!r.domain) return lines;
    if (r.cidrsV6?.length) {
      lines.push(`# ${r.domain} — IPv6 CIDR`);
      r.cidrsV6.forEach(({ cidr }) => lines.push(`/ipv6 firewall address-list add list=${listName} address=${cidr} comment="${r.domain}-range6"`));
    }
    if (r.ipsV6?.length) {
      lines.push(`# ${r.domain} — IPv6`);
      r.ipsV6.forEach(ip => lines.push(`/ipv6 firewall address-list add list=${listName} address=${ip} comment="${r.domain}-ip6"`));
    }
    return lines;
  }).join('\n');

  // Step 3: Rules
  const firewallCmd = [
    `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
    `  /ip firewall filter add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName}" place-before=0`,
    `}`,
    ...(includeIPv6 && addIPv6Lines ? [
      `:if ([:len [/ipv6 firewall filter find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
      `  /ipv6 firewall filter add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName} v6" place-before=0`,
      `}`,
    ] : []),
  ].join('\n');

  // Step 4: Verify
  const verifyLines = [
    `/ip firewall address-list print where list=${listName}`,
    `/ip firewall filter print where dst-address-list=${listName}`,
    ...(includeIPv6 && addIPv6Lines ? [`/ipv6 firewall address-list print where list=${listName}`] : []),
  ].join('\n');

  const steps = [
    { step: 1, title: 'Remove old entries (clean update)', code: removeLines, color: 'var(--warning)', hint: 'Safe to skip on first run.' },
    { step: 2, title: 'Add IPv4 addresses to list', code: addIPv4, color: 'var(--primary)', hint: 'Paste in Winbox → New Terminal, SSH, or WebFig.' },
  ];

  if (includeIPv6 && addIPv6Lines) {
    steps.push({ step: '2b', title: 'Add IPv6 addresses to list', code: addIPv6Lines, color: '#9b59b6', hint: 'Required for RouterOS 7.x with IPv6 enabled.' });
  }

  steps.push(
    { step: 3, title: 'Add firewall drop rule (run once)', code: firewallCmd, color: 'var(--danger)', hint: 'Skip if rule already exists. Idempotent check included.' },
    { step: 4, title: 'Verify — confirm everything applied', code: verifyLines, color: 'var(--success)', hint: 'Should list all your IPs and the drop rule.' },
  );

  return steps;
}

export default function ManualTerminal({ resolved, listName = 'blocked', includeIPv6 = true }) {
  const [copyAll, setCopyAll] = useState(false);

  if (!resolved?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🖥️</div>
        <p>Resolve domains first to get terminal commands</p>
      </div>
    );
  }

  const steps = buildSteps(resolved, listName, includeIPv6);
  const allCode = steps.map(s => `# ── Step ${s.step}: ${s.title} ──\n${s.code}`).join('\n\n');

  const totalIPs   = resolved.reduce((a, r) => a + (r.ips?.length || 0), 0);
  const totalCIDRs = resolved.reduce((a, r) => a + (r.cidrs?.length || 0), 0);
  const totalIPv6  = resolved.reduce((a, r) => a + (r.ipsV6?.length || 0) + (r.cidrsV6?.length || 0), 0);

  return (
    <div>
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>🌐 <strong style={{ color: 'var(--text)' }}>{resolved.length}</strong> domains</span>
          <span>📊 <strong style={{ color: 'var(--primary)' }}>{totalCIDRs}</strong> CIDRs</span>
          <span>🔵 <strong style={{ color: 'var(--success)' }}>{totalIPs}</strong> IPs</span>
          {includeIPv6 && <span>🟣 <strong style={{ color: '#9b59b6' }}>{totalIPv6}</strong> IPv6</span>}
          <span>list: <code style={{ color: 'var(--warning)' }}>{listName}</code></span>
        </div>
        <button onClick={async () => {
          try {
            await navigator.clipboard.writeText(allCode);
            setCopyAll(true);
            toast.success('All steps copied!');
            setTimeout(() => setCopyAll(false), 2000);
          } catch { toast.error('Copy failed'); }
        }} style={{
          background: copyAll ? 'var(--success)' : 'var(--surface)',
          color: copyAll ? '#fff' : 'var(--text)',
          border: '1px solid var(--border)', borderRadius: '7px',
          padding: '0.35rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
        }}>{copyAll ? '✅ All Copied!' : '📋 Copy All Steps'}</button>
      </div>

      <div style={{
        background: 'rgba(91,141,239,0.07)', border: '1px solid rgba(91,141,239,0.25)',
        borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem',
        fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7,
      }}>
        <strong style={{ color: 'var(--primary)' }}>📡 How to apply on your MikroTik:</strong>
        <ol style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
          <li><strong>Winbox</strong> → New Terminal → paste commands</li>
          <li><strong>SSH</strong> → <code>ssh admin@192.168.88.1</code> → paste</li>
          <li><strong>WebFig</strong> → Terminal → paste commands</li>
          <li>Run steps <strong>in order: 1 → 2 → 3 → 4</strong></li>
        </ol>
      </div>

      {steps.map(s => (
        <div key={s.step}>
          <CopyBlock {...s} />
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '-1rem', marginBottom: '1.25rem', paddingLeft: '0.5rem' }}>
            💡 {s.hint}
          </p>
        </div>
      ))}
    </div>
  );
}
