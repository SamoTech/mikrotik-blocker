import React from 'react';
import PageShell from '../components/PageShell';

const YEAR = new Date().getFullYear();

export default function LicensePage() {
  return (
    <PageShell title="License" icon="📄">
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '1.5rem 1.75rem',
        fontFamily: 'var(--mono)', fontSize: '0.82rem', lineHeight: 1.9,
        color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
{`MIT License

Copyright (c) ${YEAR} SamoTech (Ossama Hashim)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
      </div>

      <div style={{ marginTop: '1.75rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.8 }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.5rem' }}>What this means</h3>
        <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
          <li>✅ Free to use commercially</li>
          <li>✅ Free to modify and distribute</li>
          <li>✅ Free to use in private projects</li>
          <li>✅ Free to sublicense</li>
          <li>⚠️ Must include original copyright notice</li>
          <li>❌ Authors not liable for damages</li>
        </ul>
      </div>
    </PageShell>
  );
}
