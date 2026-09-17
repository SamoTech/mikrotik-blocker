import React, { useState } from 'react';

function severityClass(severity) { return `doctor-severity doctor-severity-${severity}`; }

function downloadText(name, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function FirewallDoctorPage() {
  const [config, setConfig] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remediation, setRemediation] = useState(null);
  const [remediationLoading, setRemediationLoading] = useState(false);
  const [error, setError] = useState('');

  const readFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setConfig(String(reader.result || ''));
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsText(file);
  };

  const analyze = async () => {
    if (!config.trim()) { setError('Upload or paste a RouterOS export first.'); return; }
    setLoading(true); setError(''); setRemediation(null);
    try {
      const response = await fetch('/api/doctor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) { setResult(null); setError(err.message); } finally { setLoading(false); }
  };

  const generateRemediation = async () => {
    setRemediationLoading(true); setError('');
    try {
      const response = await fetch('/api/remediate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Remediation generation failed');
      setRemediation(data);
    } catch (err) { setError(err.message); } finally { setRemediationLoading(false); }
  };

  const score = result ? Math.max(0, 100 - result.summary.critical * 30 - result.summary.high * 18 - result.summary.medium * 8 - result.summary.low * 2) : null;

  return (
    <div className="doctor-page">
      <div className="doctor-hero">
        <a href="/" className="doctor-back">← MikroTik Blocker</a>
        <div className="doctor-kicker">FIREWALL DOCTOR</div>
        <h1>Audit your RouterOS firewall before you change it.</h1>
        <p>Upload an <code>export.rsc</code> or paste your configuration. The analyzer is read-only and does not connect to your router.</p>
      </div>

      <section className="doctor-card">
        <div className="doctor-upload" onClick={() => document.getElementById('doctor-file').click()} role="button" tabIndex={0}>
          <input id="doctor-file" type="file" accept=".rsc,.txt,text/plain" hidden onChange={e => readFile(e.target.files?.[0])} />
          <strong>{fileName || 'Drop RouterOS export here or click to browse'}</strong>
          <span>Read-only analysis • No router credentials • Max 2 MB</span>
        </div>
        <textarea className="doctor-editor" value={config} onChange={e => { setConfig(e.target.value); setFileName(''); }} placeholder={'# Paste /export output here\n/ip firewall filter\nadd chain=input connection-state=established,related action=accept'} spellCheck="false" aria-label="RouterOS export" />
        <div className="doctor-actions">
          <button className="doctor-primary" onClick={analyze} disabled={loading}>{loading ? 'Analyzing…' : 'Run Firewall Doctor'}</button>
          {config && <button className="doctor-secondary" onClick={() => { setConfig(''); setFileName(''); setResult(null); setRemediation(null); setError(''); }}>Clear</button>}
        </div>
        {error && <div className="doctor-error" role="alert">{error}</div>}
      </section>

      {result && (
        <section className="doctor-results" aria-live="polite">
          <div className="doctor-score-card">
            <div><span className="doctor-label">FIREWALL HEALTH SCORE</span><strong className="doctor-score">{score}</strong><span className="doctor-score-max">/100</span></div>
            <div className="doctor-coverage"><span>IPv4 <b>{result.coverage.ipv4 ? '✓' : '—'}</b></span><span>IPv6 <b>{result.coverage.ipv6 ? '✓' : '—'}</b></span></div>
          </div>
          <div className="doctor-summary-grid">
            {['critical', 'high', 'medium', 'low'].map(level => <div key={level} className={severityClass(level)}><b>{result.summary[level]}</b><span>{level}</span></div>)}
          </div>
          <div className="doctor-findings">
            <div className="doctor-section-title"><h2>Findings</h2><span>{result.summary.findings} detected</span></div>
            {!result.findings.length && <div className="doctor-empty">No findings. This is not proof of a secure configuration; review remains necessary.</div>}
            {result.findings.map((finding, index) => (
              <article className="doctor-finding" key={`${finding.id}-${index}`}>
                <div className="doctor-finding-head"><span className={severityClass(finding.severity)}>{finding.severity}</span><h3>{finding.title}</h3></div>
                <p><b>Evidence:</b> {finding.evidence}</p>
                <p><b>Recommended fix:</b> {finding.fix}</p>
              </article>
            ))}
          </div>
          <div className="doctor-remediation-card">
            <div className="doctor-section-title"><div><h2>Safe Remediation</h2><p>Generate a reviewable patch and rollback script. Nothing is applied automatically.</p></div></div>
            <button className="doctor-primary" onClick={generateRemediation} disabled={remediationLoading}>{remediationLoading ? 'Generating…' : 'Generate Fix + Rollback'}</button>
          </div>
          {remediation && (
            <div className="doctor-remediation-results">
              <div className="doctor-remediation-meta"><b>{remediation.summary.proposed_changes}</b> proposed changes · <b>{remediation.summary.review_only}</b> review-only notes</div>
              <div className="doctor-code-grid">
                <div><div className="doctor-code-head"><h3>review.patch.rsc</h3><button className="doctor-secondary" onClick={() => downloadText('review.patch.rsc', remediation.patch)}>Download</button></div><pre>{remediation.patch}</pre></div>
                <div><div className="doctor-code-head"><h3>rollback.rsc</h3><button className="doctor-secondary" onClick={() => downloadText('rollback.rsc', remediation.rollback)}>Download</button></div><pre>{remediation.rollback}</pre></div>
              </div>
              <ol className="doctor-instructions">{remediation.instructions.map((item, i) => <li key={i}>{item}</li>)}</ol>
            </div>
          )}
        </section>
      )}
      <footer className="doctor-footer">Firewall Doctor is advisory and non-destructive. Review every generated command before deployment.</footer>
    </div>
  );
}
