import React, { useRef } from 'react';

export default function FileImport({ onImport }) {
  const inputRef = useRef();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const domains = text
        .split(/[\n,;\r]+/)
        .map(l => l.trim()
          .replace(/^https?:\/\//i, '')
          .replace(/\/.*$/, '')
          .replace(/^www\./, '')
          .toLowerCase()
        )
        .filter(d => /^[a-z0-9][a-z0-9.-]{1,253}\.[a-z]{2,}$/.test(d));
      if (domains.length > 0) onImport([...new Set(domains)].slice(0, 50));
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,.list,.conf"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => inputRef.current?.click()}
        title="Import domains from .txt or .csv file"
        style={{ width: '100%', marginTop: '0.4rem' }}
      >
        📂 Import from file (.txt / .csv)
      </button>
    </>
  );
}
