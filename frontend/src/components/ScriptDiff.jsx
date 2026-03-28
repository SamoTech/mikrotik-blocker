import React, { useMemo } from 'react';

/**
 * ScriptDiff — compares two .rsc scripts and highlights added/removed lines.
 * Purely client-side, no diff library needed for line-level diff.
 */
export default function ScriptDiff({ previous, current }) {
  const diff = useMemo(() => {
    if (!previous || !current) return null;
    const oldLines = previous.split('\n');
    const newLines = current.split('\n');
    const oldSet   = new Set(oldLines);
    const newSet   = new Set(newLines);

    const added   = newLines.filter(l => !oldSet.has(l) && !l.startsWith('#') && l.trim());
    const removed = oldLines.filter(l => !newSet.has(l) && !l.startsWith('#') && l.trim());

    return { added, removed };
  }, [previous, current]);

  if (!diff) return null;
  if (diff.added.length === 0 && diff.removed.length === 0) {
    return (
      <div style={{
        background: 'rgba(76,175,125,0.08)', border: '1px solid var(--success)',
        borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.82rem',
        color: 'var(--success)', marginBottom: '0.75rem',
      }}>
        ✔ No changes since last resolve
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{
        fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)',
        marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>Script Diff (vs previous)</div>

      {diff.added.length > 0 && (
        <div style={{
          background: 'rgba(76,175,125,0.06)', border: '1px solid rgba(76,175,125,0.3)',
          borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.4rem',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700, marginBottom: '0.35rem' }}>
            + {diff.added.length} new
          </div>
          {diff.added.slice(0, 10).map((l, i) => (
            <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--success)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>+ {l}</div>
          ))}
          {diff.added.length > 10 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>…and {diff.added.length - 10} more</div>
          )}
        </div>
      )}

      {diff.removed.length > 0 && (
        <div style={{
          background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.3)',
          borderRadius: '8px', padding: '0.6rem 0.75rem',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '0.35rem' }}>
            - {diff.removed.length} removed
          </div>
          {diff.removed.slice(0, 10).map((l, i) => (
            <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--danger)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>- {l}</div>
          ))}
          {diff.removed.length > 10 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>…and {diff.removed.length - 10} more</div>
          )}
        </div>
      )}
    </div>
  );
}
