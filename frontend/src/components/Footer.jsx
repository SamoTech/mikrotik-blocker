import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { to: '/sponsors',  label: '💛 Sponsors' },
    { to: '/changelog', label: '📋 Changelog' },
    { to: '/license',   label: '📄 License' },
    { to: '/privacy',   label: '🔒 Privacy' },
    { to: '/terms',     label: '📜 Terms' },
  ];

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '1.5rem 2rem',
      marginTop: '2rem',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      fontSize: '0.78rem',
      color: 'var(--text-muted)',
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <span><strong style={{ color: 'var(--text)' }}>MikroTik Blocker</strong> &copy; {year}</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>MIT License</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>Built by{' '}
          <a
            href="https://github.com/SamoTech"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'none' }}
          >SamoTech</a>
        </span>
      </div>

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem 1rem' }}>
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >
            {l.label}
          </Link>
        ))}
        <a
          href="https://github.com/SamoTech/mikrotik-blocker"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = 'var(--primary)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
        >
          ⭐ GitHub
        </a>
      </nav>
    </footer>
  );
}
