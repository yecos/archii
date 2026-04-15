"use client";

import Script from "next/script";

export default function AuthHandler() {
  return (
    <html>
      <head>
        <Script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js" />
        <Script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              firebase.initializeApp({
                apiKey: "AIzaSyBQOTu97ACa8Im9V8zcvWfEoVRIFDVK1Ho",
                authDomain: "archiflow-prod-2026.firebaseapp.com",
                projectId: "archiflow-prod-2026",
                storageBucket: "archiflow-prod-2026.firebasestorage.app",
                messagingSenderId: "1090724963650",
                appId: "1:1090724963650:web:28468b10aef5e89c0f54db"
              });
              try {
                firebase.auth().getRedirectResult().then(function(result) {
                  if (result.credential || result.user) {
                    if (window.opener) {
                      window.opener.postMessage({ type: 'firebase-auth-success' }, window.location.origin);
                    }
                  }
                }).catch(function(err) {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'firebase-auth-error', error: err.message }, window.location.origin);
                  }
                });
              } catch(e) {}
              if (window.opener) {
                try {
                  var p = new URLSearchParams(window.location.search);
                  var e = p.get("authEvent");
                  if (e) window.opener.postMessage(JSON.parse(decodeURIComponent(e)), location.origin);
                } catch(err) {}
              }
              setTimeout(function(){ try { window.close(); } catch(e) { window.location.href = '/'; } }, 2000);
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif', background: '#0f172a', color: '#e2e8f0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(200,169,110,0.2)', borderTopColor: '#c8a96e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p>Completando autenticacion...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </body>
    </html>
  );
}
