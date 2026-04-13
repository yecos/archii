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
        {/* Theme init - prevent FOUC */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('archiflow-theme') || 'dark';
              if (theme === 'dark') document.documentElement.classList.add('dark');
              else document.documentElement.classList.remove('dark');
            } catch(e) { document.documentElement.classList.add('dark'); }
          })();
        ` }} />
      </head>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <Script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js" strategy="beforeInteractive" />
        <Script id="firebase-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `
          if (typeof firebase !== 'undefined' && (!firebase.apps || firebase.apps.length === 0)) {
            firebase.initializeApp({
              apiKey: "AIzaSyCFnr_TbEEnYPqBSJRPSn0G3oORHo9Guu0",
              authDomain: "archiflow-c2855.firebaseapp.com",
              projectId: "archiflow-c2855",
              storageBucket: "archiflow-c2855.firebasestorage.app",
              messagingSenderId: "247246043394",
              appId: "1:247246043394:web:408e1365957eea4ee2aa1b"
            });
            try {
              firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function() {});
            } catch(e) {}
          }
        ` }} />
        {/* Register Service Worker */}
        <Script id="sw-register" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        ` }} />
        {children}
        {/* AI Assistant - Floating wrapper (lee contexto del store) */}
        <AIFloatingWrapper />
        {/* Keyboard Shortcuts - Global initialization */}
        <KeyboardShortcutsInitializer />
      </body>
    </html>
  );
}
