import React, { useState } from 'react';
import toast from 'react-hot-toast';

const STEP_STYLE = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1rem',
  marginBottom: '1rem',
};

const CODE_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.6rem 0.8rem',
  fontFamily: 'var(--mono)',
  fontSize: '0.78rem',
  lineHeight: 1.7,
  overflowX: 'auto',
  whiteSpace: 'pre',
  color: 'var(--text)',
  marginTop: '0.5rem',
};

function CopyBlock({ lines, label }) {
  const text = Array.isArray(lines) ? lines.join('\n') : lines;
  const copy = () => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied!`))
      .catch(() => toast.error('Copy failed'));
  };
  return (
    <div style={{ position: 'relative', marginTop: '0.5rem' }}>
      <button
        onClick={copy}
        style={{
          position: 'absolute', top: '0.4rem', right: '0.4rem',
          background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: '5px',
          padding: '0.2rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer', zIndex: 1,
        }}
      >
        📋 Copy
      </button>
      <pre style={CODE_STYLE}>{text}</pre>
    </div>
  );
}

export default function ManualTerminal({ resolved, listName = 'blocked', includeIPv6 = true, addLayer7 = false }) {
  if (!resolved || resolved.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🖥️</div>
        <p>Resolve domains first to see terminal commands</p>
      </div>
    );
  }

  const validResolved = resolved.filter(r => r.domain);

  // ── Step: Layer7 Protocol (optional) ─────────────────────────
  const layer7AddLines = [];
  const layer7FilterLines = [];
  if (addLayer7) {
    layer7AddLines.push('/ip firewall layer7-protocol');
    for (const r of validResolved) {
      if (!r.layer7Regex) continue;
      const ruleName = `l7-${r.domain.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      layer7AddLines.push(
        `:if ([:len [find name=${ruleName}]] = 0) do={`,
        `  add name=${ruleName} regexp="${r.layer7Regex}"`,
        `}`,
      );
      layer7FilterLines.push(
        `/ip firewall filter`,
        `:if ([:len [find chain=forward layer7-protocol=${ruleName} action=drop]] = 0) do={`,
        `  add chain=forward layer7-protocol=${ruleName} action=drop comment="L7-block ${r.domain}" place-before=0`,
        `}`,
      );
    }
  }

  // ── Step: Remove existing entries ────────────────────────────
  const removeLines = validResolved.flatMap(r => [
    `/ip firewall address-list remove [find list=${listName} comment~"${r.domain}"]`,
    ...(includeIPv6 && (r.cidrsV6?.length || r.ipsV6?.length)
      ? [`/ipv6 firewall address-list remove [find list=${listName} comment~"${r.domain}"]`]
      : []),
  ]);

  // ── Step: IPv4 address-list ───────────────────────────────────
  const ipv4Lines = ['/ip firewall address-list'];
  for (const r of validResolved) {
    if (r.cidrs?.length > 0) {
      ipv4Lines.push(`# ${r.domain} — CIDR ranges`);
      r.cidrs.forEach(({ cidr }) =>
        ipv4Lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range"`)
      );
    }
    if (r.ips?.length > 0) {
      ipv4Lines.push(`# ${r.domain} — IPv4`);
      r.ips.forEach(ip =>
        ipv4Lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip"`)
      );
    }
  }

  // ── Step: IPv6 address-list ───────────────────────────────────
  const ipv6Lines = [];
  if (includeIPv6) {
    const hasV6 = validResolved.some(r => r.cidrsV6?.length || r.ipsV6?.length);
    if (hasV6) {
      ipv6Lines.push('/ipv6 firewall address-list');
      for (const r of validResolved) {
        if (r.cidrsV6?.length > 0) {
          ipv6Lines.push(`# ${r.domain} — IPv6 CIDR`);
          r.cidrsV6.forEach(({ cidr }) =>
            ipv6Lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range6"`)
          );
        }
        if (r.ipsV6?.length > 0) {
          ipv6Lines.push(`# ${r.domain} — IPv6`);
          r.ipsV6.forEach(ip =>
            ipv6Lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip6"`)
          );
        }
      }
    }
  }

  // ── Step: Firewall filter ─────────────────────────────────────
  const filterLines = [
    `/ip firewall filter`,
    `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
    `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName}" place-before=0`,
    `}`,
    ...(includeIPv6 ? [
      `/ipv6 firewall filter`,
      `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
      `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName} IPv6" place-before=0`,
      `}`,
    ] : []),
  ];

  // ── Step: Verify ──────────────────────────────────────────────
  const verifyLines = [
    `/ip firewall address-list print where list=${listName}`,
    `/ip firewall filter print where dst-address-list=${listName}`,
    ...(addLayer7 ? [`/ip firewall layer7-protocol print`] : []),
    ...(includeIPv6 ? [`/ipv6 firewall address-list print where list=${listName}`] : []),
  ];

  let stepNum = 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* Layer7 Step */}
      {addLayer7 && layer7AddLines.length > 1 && (
        <div style={{ ...STEP_STYLE, borderColor: '#e05252' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h4 style={{ color: '#e05252', fontSize: '0.82rem', margin: 0 }}>Step {stepNum++} — Layer7 Protocol Patterns</h4>
            <span style={{
              fontSize: '0.68rem', background: 'rgba(224,82,82,0.12)',
              color: '#e05252', padding: '0.1rem 0.5rem', borderRadius: '4px',
            }}>HTTP Host + TLS SNI</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Blocks domain by name — works even when IPs rotate. Runs before IP-based rules.
          </p>
          <CopyBlock lines={layer7AddLines} label="Layer7 patterns" />
          {layer7FilterLines.length > 0 && (
            <CopyBlock lines={layer7FilterLines} label="Layer7 filter rules" />
          )}
        </div>
      )}

      {/* Remove */}
      <div style={STEP_STYLE}>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Step {stepNum++} — Remove existing entries</h4>
        <CopyBlock lines={removeLines} label="Remove" />
      </div>

      {/* IPv4 */}
      <div style={STEP_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Step {stepNum++} — IPv4 address list</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {validResolved.reduce((a, r) => a + (r.cidrs?.length || 0), 0)} CIDR + 
            {validResolved.reduce((a, r) => a + (r.ips?.length   || 0), 0)} IPs
          </span>
        </div>
        <CopyBlock lines={ipv4Lines} label="IPv4 list" />
      </div>

      {/* IPv6 */}
      {ipv6Lines.length > 0 && (
        <div style={STEP_STYLE}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Step {stepNum++} — IPv6 address list</h4>
            <span style={{ fontSize: '0.72rem', color: '#9b59b6' }}>IPv6</span>
          </div>
          <CopyBlock lines={ipv6Lines} label="IPv6 list" />
        </div>
      )}

      {/* Firewall rules */}
      <div style={STEP_STYLE}>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Step {stepNum++} — Firewall drop rules</h4>
        <CopyBlock lines={filterLines} label="Firewall rules" />
      </div>

      {/* Verify */}
      <div style={STEP_STYLE}>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Step {stepNum++} — Verify</h4>
        <CopyBlock lines={verifyLines} label="Verify" />
      </div>
    </div>
  );
}
