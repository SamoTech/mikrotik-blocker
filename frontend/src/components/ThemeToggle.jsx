import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'mtblocker_theme';

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export default function ThemeToggle({ theme, toggle }) {
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.35rem 0.7rem',
        cursor: 'pointer',
        fontSize: '1rem',
        lineHeight: 1,
        color: 'var(--text)',
        transition: 'background 0.2s',
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
