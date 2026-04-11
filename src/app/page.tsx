'use client';
import { useEffect, useState, type ComponentType } from 'react';

export default function Page() {
  const [Home, setHome] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('./HomeContent')
      .then(mod => {
        setHome(() => mod.default);
      })
      .catch(err => {
        console.error('[ArchiFlow] Error cargando HomeContent:', err);
        setError(String(err?.message || err));
      });
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117', color: '#ef4444', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Error al cargar ArchiFlow</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!Home) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117', color: '#c8a96e' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏗️</div>
          <div style={{ fontSize: '1rem' }}>Cargando ArchiFlow...</div>
        </div>
      </div>
    );
  }

  return <Home />;
}
