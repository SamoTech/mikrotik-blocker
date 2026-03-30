import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🔍',
    title: 'DNS Resolution',
    desc: 'Automatically resolves every domain to its real IPv4 and IPv6 addresses using live DNS lookups — no manual IP hunting.',
  },
  {
    icon: '📊',
    title: 'ASN / CIDR Ranges',
    desc: 'Looks up the Autonomous System Number behind a domain and fetches the full BGP CIDR prefix — blocking the entire IP range, not just one IP.',
  },
  {
    icon: '🔍',
    title: 'Layer7 Protocol Block',
    desc: 'Generates Layer7 regex rules that match HTTP Host headers and TLS SNI — catching connections that bypass pure IP blocking.',
  },
  {
    icon: '📋',
    title: 'RouterOS Script Output',
    desc: 'Produces ready-to-paste MikroTik scripts for both RouterOS v6 (space syntax) and v7 (slash syntax) — copy, paste, done.',
  },
  {
    icon: '🖥️',
    title: 'Interactive Terminal',
    desc: 'A step-by-step terminal mode that breaks the script into individual commands — ideal for live router sessions.',
  },
  {
    icon: '⏰',
    title: 'Auto-Refresh Scheduler',
    desc: 'Schedule automatic re-resolution of your domain list on an interval — keeps your address lists fresh as IPs rotate.',
  },
  {
    icon: '💾',
    title: 'Preset Manager',
    desc: 'Save your frequently used domain sets and script options as named presets — reload them instantly with one click.',
  },
  {
    icon: '📁',
    title: 'File Import',
    desc: 'Import domain lists from plain text files — paste a hosts file, a blocklist export, or any newline-separated list.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Enter your domains',
    desc: 'Type or paste the domains you want to block — one per line. You can also import a .txt file or load a saved preset.',
  },
  {
    step: '2',
    title: 'Choose script options',
    desc: 'Pick your RouterOS version (v6 or v7), address list name, output mode (CIDR / IPs / both), and optional flags like Layer7 or IPv6.',
  },
  {
    step: '3',
    title: 'Generate the script',
    desc: 'Press Ctrl+Enter or click Generate. The tool resolves each domain via DNS and ASN lookups, then builds a complete RouterOS script.',
  },
  {
    step: '4',
    title: 'Paste into MikroTik',
    desc: 'Copy the output script and paste it into your RouterOS terminal (Winbox, SSH, or WebFig). The address list and firewall rules are created instantly.',
  },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem', color: 'var(--text)' }}>

      {/* Hero */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '2.5rem 2rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
          MikroTik Blocker
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto 1.25rem' }}>
          A free, open-source web tool that turns a list of domain names into a complete
          MikroTik RouterOS firewall script — ready to block in seconds.
        </p>
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{
            background: 'var(--primary)', color: '#fff',
            padding: '0.55rem 1.4rem', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem',
          }}>🚀 Open the Tool</Link>
          <a
            href="https://github.com/SamoTech/mikrotik-blocker"
            target="_blank" rel="noreferrer"
            style={{
              background: 'var(--surface2)', color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '0.55rem 1.4rem', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            }}>⭐ Star on GitHub</a>
        </div>
      </div>

      {/* What is this */}
      <section style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>🤔 What is MikroTik Blocker?</h2>
        <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'var(--text)', marginBottom: '0.9rem' }}>
          MikroTik routers are powerful — but writing firewall scripts to block domains by hand is tedious and error-prone.
          Domains don't have fixed IPs. They resolve to different addresses over time, they're backed by CDNs
          that serve hundreds of IP ranges, and they require both IPv4 and IPv6 handling.
        </p>
        <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'var(--text)', marginBottom: '0.9rem' }}>
          <strong>MikroTik Blocker</strong> solves this completely. You provide the domain names —
          the tool does all the DNS lookups, BGP ASN queries, CIDR aggregation, and script generation automatically.
          The output is a clean, copy-paste-ready <code style={{ background: 'var(--surface2)', padding: '0.1rem 0.35rem', borderRadius: 4, fontSize: '0.85rem' }}>.rsc</code> script
          or an interactive terminal session for your RouterOS device.
        </p>
        <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'var(--text)' }}>
          It's designed for network administrators, ISPs, schools, businesses, and home lab enthusiasts
          who manage MikroTik infrastructure and need reliable, up-to-date firewall rules without the manual work.
        </p>
      </section>

      {/* How it works */}
      <section style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.1rem' }}>⚙️ How It Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {HOW_IT_WORKS.map(s => (
            <div key={s.step} style={{
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
              padding: '0.85rem 1rem',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <span style={{
                minWidth: 28, height: 28,
                background: 'var(--primary)', color: '#fff',
                borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.82rem', flexShrink: 0,
              }}>{s.step}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.1rem' }}>✨ Features</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '0.75rem',
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              padding: '0.9rem 1rem',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.87rem', marginBottom: '0.25rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Who is it for */}
      <section style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>👥 Who Is It For?</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
          {[
            '🏫 Schools & universities',
            '🏢 Businesses & offices',
            '🌐 ISPs & hosters',
            '🏠 Home lab enthusiasts',
            '🛡️ Network administrators',
            '🔧 MikroTik power users',
            '👨‍👩‍👧 Family network managers',
            '☁️ Cloud & VPS operators',
          ].map(tag => (
            <span key={tag} style={{
              padding: '0.3rem 0.85rem',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: '0.82rem',
              color: 'var(--text)',
            }}>{tag}</span>
          ))}
        </div>
      </section>

      {/* Open source */}
      <section style={{
        background: 'color-mix(in srgb, var(--primary) 6%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--primary) 25%, var(--border))',
        borderRadius: 'var(--radius)',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌍</div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Free & Open Source</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 1rem' }}>
          MikroTik Blocker is 100% free, MIT-licensed, and open source.
          Built and maintained by <a href="https://github.com/SamoTech" target="_blank" rel="noreferrer"
          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>SamoTech</a>.
          Contributions, bug reports, and feature requests are always welcome.
        </p>
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://github.com/SamoTech/mikrotik-blocker" target="_blank" rel="noreferrer"
            style={{
              background: 'var(--primary)', color: '#fff',
              padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.87rem',
            }}>⭐ Star on GitHub</a>
          <Link to="/sponsors"
            style={{
              background: 'var(--surface2)', color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.87rem',
            }}>💛 Support the Project</Link>
        </div>
      </section>

    </div>
  );
}
