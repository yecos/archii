import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import KeyboardShortcutsInitializer from "@/components/archiflow/KeyboardShortcutsInitializer";
import { AppProviders } from "@/components/layout/AppProviders";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "ArchiFlow — Gestión de Proyectos",
    template: "%s | ArchiFlow",
  },
  description: "Plataforma integral de gestión de proyectos de arquitectura e interiorismo. Planifica, ejecuta y controla todos tus proyectos en un solo lugar.",
  keywords: ["arquitectura", "interiorismo", "gestión de proyectos", "construcción", "presupuestos", "planificación de obra", "colombia"],
  authors: [{ name: "ArchiFlow" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArchiFlow",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "ArchiFlow",
    title: "ArchiFlow — Gestión de Proyectos de Arquitectura",
    description: "Plataforma integral de gestión de proyectos de arquitectura e interiorismo.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArchiFlow — Gestión de Proyectos",
    description: "Plataforma integral de gestión de proyectos de arquitectura e interiorismo.",
  },
  robots: {
    index: true,
    follow: true,
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
const FB_STORAGE = "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js";

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
        <script src={FB_STORAGE} />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (typeof firebase !== 'undefined' && (!firebase.apps || firebase.apps.length === 0)) {
              var cfg = {
                    apiKey: "AIzaSyBQOTu97ACa8Im9V8zcvWfEoVRIFDVK1Ho",
  authDomain: "archiflow-prod-2026.firebaseapp.com",
  projectId: "archiflow-prod-2026",
  storageBucket: "archiflow-prod-2026.firebasestorage.app",
  messagingSenderId: "1090724963650",
  appId: "1:1090724963650:web:28468b10aef5e89c0f54db",
              };
              firebase.initializeApp(cfg);
              try { firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function(){}); } catch(e){}
            }
            window.__AF_FB = true;
            console.log('[ArchiFlow] Firebase ready:', firebase.apps[0]?.options?.projectId);
          } catch(err) {
            console.error('[ArchiFlow] Firebase init failed:', err);
            window.__AF_FB = false;
          }
        ` }} />

        {/* Theme init - prevent FOUC (mirrors next-themes logic) */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('archiflow-theme');
            var d = 'system';
            if (t === 'light' || t === 'dark' || t === 'system') d = t;
            else if (t === null || t === undefined) d = 'system';
            if (d === 'system') {
              var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.classList.toggle('dark', m);
            } else {
              document.documentElement.classList.toggle('dark', d === 'dark');
            }
          } catch(e) {
            document.documentElement.classList.add('dark');
          }
        ` }} />

        {/* Color theme init - set data attribute before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try {
    var ct = localStorage.getItem('archiflow-color-theme');
    var dm = localStorage.getItem('archiflow-theme');
    var isDark = false;
    if (dm === 'dark') isDark = true;
    else if (dm === 'system' || !dm) isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (ct && ct !== 'dorado') {
      document.documentElement.setAttribute('data-color-theme', ct);
    }
  } catch(e) {}
})();
        ` }} />
      </head>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider>
        {/* Register Service Worker */}
        <Script id="sw-register" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        ` }} />
        {children}
        {/* Global providers: Toaster + ConfirmDialog */}
        <AppProviders />
        {/* Keyboard Shortcuts - Global initialization */}
        <KeyboardShortcutsInitializer />
        </ThemeProvider>
      </body>
    </html>
  );
}
