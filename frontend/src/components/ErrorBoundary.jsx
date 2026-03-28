import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'Unknown error' };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f1117', color: '#e8eaf6', fontFamily: 'sans-serif', padding: '2rem',
          flexDirection: 'column', gap: '1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: '#e05252' }}>Something went wrong</h2>
          <p style={{ color: '#8b90b8', maxWidth: '480px', lineHeight: 1.6 }}>{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem', padding: '0.5rem 1.5rem',
              background: '#5b8def', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
            }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
