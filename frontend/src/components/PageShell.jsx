import React from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

export default function PageShell({ title, icon, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Mini header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0.9rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'var(--surface)',
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          textDecoration: 'none', color: 'var(--text)',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🔒</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>MikroTik Blocker</span>
        </Link>
        <span style={{ opacity: 0.4 }}>›</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{icon} {title}</span>
      </header>

      {/* Content */}
      <main style={{
        flex: 1,
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
      }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {icon} {title}
        </h1>
        {children}
      </main>

      <Footer />
    </div>
  );
}
