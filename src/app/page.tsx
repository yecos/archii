'use client';
import { useState, useEffect } from 'react';

export default function Page() {
  const [Module, setModule] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    import('./HomeContent')
      .then(mod => {
        if (!cancelled) setModule(() => mod.default);
      })
      .catch(err => {
        if (!cancelled) setError(String(err?.message || err));
      });
    return () => { cancelled = true; };
  }, [retryCount]);

  if (error) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#0e0f11', color:'#f0f0ee', fontFamily:"'DM Sans',sans-serif", textAlign:'center', padding:20 }}>
        <div>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <div style={{ fontSize:16, marginBottom:8, color:'#c8a96e' }}>Error al cargar</div>
          <pre style={{ fontSize:12, color:'#e05555', maxWidth:500, whiteSpace:'pre-wrap', textAlign:'left', background:'#1e2128', padding:16, borderRadius:12 }}>{error}</pre>
          <button onClick={() => setRetryCount(c => c+1)} style={{ marginTop:20, padding:'10px 24px', borderRadius:12, border:'1px solid rgba(200,169,110,0.3)', background:'rgba(200,169,110,0.1)', color:'#c8a96e', fontSize:14, cursor:'pointer' }}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!Module) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#0e0f11', color:'#f0f0ee', fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ width:48, height:48, border:'3px solid rgba(200,169,110,0.2)', borderTopColor:'#c8a96e', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginLeft:16, fontSize:14, color:'#9a9b9e' }}>Cargando ArchiFlow...</p>
      </div>
    );
  }

  return <Module />;
}