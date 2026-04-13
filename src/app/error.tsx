'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0e0f11', color: '#f0f0ee', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
        <h2 style={{ fontSize: 18, marginBottom: 12, color: '#c8a96e' }}>Error en ArchiFlow</h2>
        <p style={{ fontSize: 12, color: '#9a9b9e', marginBottom: 8 }}>Error capturado por error.tsx:</p>
        <pre style={{ fontSize: 11, color: '#e05555', background: '#1e2128', padding: 16, borderRadius: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '50vh', overflow: 'auto' }}>
          {error?.message || String(error)}
        </pre>
        {error?.stack && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12, color: '#9a9b9e', cursor: 'pointer' }}>Ver stack trace</summary>
            <pre style={{ fontSize: 10, color: '#9a9b9e', background: '#1e2128', padding: 12, borderRadius: 12, marginTop: 8, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
              {error.stack}
            </pre>
          </details>
        )}
        <button onClick={reset} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(200,169,110,0.3)', background: 'rgba(200,169,110,0.1)', color: '#c8a96e', fontSize: 14, cursor: 'pointer' }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
