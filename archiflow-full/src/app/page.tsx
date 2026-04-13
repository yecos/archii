'use client';
import dynamic from 'next/dynamic';

/**
 * page.tsx — Entry point
 * 
 * Carga HomeContent dinámicamente SIN SSR para evitar
 * errores de Turbopack con Firebase.
 */

const HomeContent = dynamic(() => import('./HomeContent'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', backgroundColor: '#0e0f11',
      color: '#f0f0ee', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '48px', height: '48px', border: '3px solid rgba(200,169,110,0.2)',
        borderTopColor: '#c8a96e', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#9a9b9e' }}>
        Cargando ArchiFlow...
      </p>
    </div>
  ),
});

export default function Home() {
  return <HomeContent />;
}
