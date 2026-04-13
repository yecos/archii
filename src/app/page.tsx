import dynamic from 'next/dynamic';

const HomeContent = dynamic(() => import('./HomeContent'), { 
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0f1117', color: '#c8a96e', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>🏗️</div>
        <div style={{ fontSize: '1rem', opacity: 0.8 }}>Cargando ArchiFlow...</div>
      </div>
    </div>
  )
});

export default function Page() {
  return <HomeContent />;
}
