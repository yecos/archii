'use client';
import { useState, useEffect } from 'react';

/**
 * page.tsx — Lazy-loading wrapper
 * 
 * HomeContent.tsx contiene toda la lógica pesada de Firebase.
 * Este wrapper la carga dinámicamente con useEffect + import()
 * para evitar que Turbopack intente hacer SSR del componente
 * (lo cual causa el error "This page couldn't load").
 * 
 * IMPORTANTE: No importar NADA de Firebase aquí.
 * Todas las importaciones pesadas van en HomeContent.tsx.
 */

export default function Home() {
  const [HomeContent, setHomeContent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadHomeContent = async () => {
      try {
        setError(null);
        // Limpiar caché de módulo para forzar recarga
        const mod = await import('./HomeContent');
        if (!cancelled) {
          setHomeContent(() => mod.default);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('[ArchiFlow] Error cargando HomeContent:', e);
          setError(e?.message || String(e));
        }
      }
    };

    loadHomeContent();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  // Mostrar pantalla de carga
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0e0f11',
        color: '#f0f0ee',
        fontFamily: "'DM Sans', sans-serif",
        padding: '20px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '16px',
          background: 'rgba(200,169,110,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          fontSize: '28px',
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#c8a96e' }}>
          Error al cargar
        </h2>
        <p style={{ fontSize: '13px', color: '#9a9b9e', maxWidth: '400px', marginBottom: '20px', lineHeight: '1.5' }}>
          {error}
        </p>
        <button
          onClick={() => { setRetryCount(c => c + 1); }}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(200,169,110,0.3)',
            background: 'rgba(200,169,110,0.1)',
            color: '#c8a96e',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!HomeContent) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0e0f11',
        color: '#f0f0ee',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(200,169,110,0.2)',
          borderTopColor: '#c8a96e',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#9a9b9e' }}>
          Cargando ArchiFlow...
        </p>
      </div>
    );
  }

  return <HomeContent />;
}
