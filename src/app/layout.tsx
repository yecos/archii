import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import AIFloatingWrapper from "@/components/archiflow/AIFloatingWrapper";
import KeyboardShortcutsInitializer from "@/components/archiflow/KeyboardShortcutsInitializer";

export const metadata: Metadata = {
  title: "ArchiFlow — Gestión de Proyectos",
  description: "Plataforma integral de gestión de proyectos de arquitectura e interiorismo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArchiFlow",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#c8a96e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* ── Firebase SDK URLs ── */
const FB_APP = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
const FB_AUTH = "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js";
const FB_FS = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-48.png" />
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-128.png" />
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ArchiFlow" />
        {/* PWA Icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* ── Firebase SDK — synchronous scripts, MUST be first in <head> ── */}
        {/* Using native <script> (not Next.js <Script>) to guarantee synchronous loading */}
        {/* These run BEFORE React hydrates, so firebase is always available */}
        <script src={FB_APP} />
        <script src={FB_AUTH} />
        <script src={FB_FS} />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (typeof firebase !== 'undefined' && (!firebase.apps || firebase.apps.length === 0)) {
              firebase.initializeApp({
                apiKey: "AIzaSyBQOTu97ACa8Im9V8zcvWfEoVRIFDVK1Ho",
                authDomain: "archiflow-prod-2026.firebaseapp.com",
                projectId: "archiflow-prod-2026",
                storageBucket: "archiflow-prod-2026.firebasestorage.app",
                messagingSenderId: "1090724963650",
                appId: "1:1090724963650:web:28468b10aef5e89c0f54db"
              });
              try { firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function(){}); } catch(e){}
            }
            window.__AF_FB = true;
            console.log('[ArchiFlow] Firebase ready:', firebase.apps[0]?.options?.projectId);
          } catch(err) {
            console.error('[ArchiFlow] Firebase init failed:', err);
            window.__AF_FB = false;
          }
        ` }} />

        {/* Theme init - prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('archiflow-theme') || 'dark';
            if (t === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          } catch(e) { document.documentElement.classList.add('dark'); }
        ` }} />

        {/* Global error handler — catch and log client-side errors */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(msg, url, line, col, err) {
            console.error('[ArchiFlow Global Error]', msg, url, line, col, err);
            return false;
          };
          window.addEventListener('unhandledrejection', function(e) {
            console.error('[ArchiFlow Unhandled Promise]', e.reason);
          });
        ` }} />
      </head>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        {/* Register Service Worker */}
        <Script id="sw-register" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        ` }} />
        {children}
        {/* AI Assistant - Floating wrapper */}
        <AIFloatingWrapper />
        {/* Keyboard Shortcuts - Global initialization */}
        <KeyboardShortcutsInitializer />
      </body>
    </html>
  );
}
