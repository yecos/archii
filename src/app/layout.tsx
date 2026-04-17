import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import KeyboardShortcutsInitializer from "@/components/archiflow/KeyboardShortcutsInitializer";
import { AppProviders } from "@/components/layout/AppProviders";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { firebaseConfig } from "@/lib/firebase-config";

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
        {/* Fix Google avatar URLs — prevent referrer blocking on background-image */}
        <meta name="referrer" content="no-referrer-when-downgrade" />
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
              firebase.initializeApp(${JSON.stringify(firebaseConfig)});
              try { firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function(){}); } catch(e){}
            }
            window.__AF_FB = true;
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
        {/* Register Service Worker — auto-reload on update */}
        <Script id="sw-register" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                // Check for SW updates on every page load
                reg.update();
                // Auto-reload when new SW activates
                reg.addEventListener('updatefound', function() {
                  var newWorker = reg.installing;
                  newWorker.addEventListener('statechange', function() {
                    if (newWorker.state === 'activated') {
                      // New SW activated — clear old caches and reload
                      caches.keys().then(function(names) {
                        return Promise.all(names.filter(function(n) {
                          return !n.includes('v7');
                        }).map(function(n) { return caches.delete(n); }));
                      }).then(function() {
                        console.log('[ArchiFlow] Service Worker updated, reloading...');
                        window.location.reload();
                      });
                    }
                  });
                });
                // Also listen for SW_UPDATED message (from activate event)
                navigator.serviceWorker.addEventListener('message', function(event) {
                  if (event.data && event.data.type === 'SW_UPDATED') {
                    console.log('[ArchiFlow] SW update message received, reloading...');
                    window.location.reload();
                  }
                });
                // Check for updates every 10 minutes
                setInterval(function() { reg.update(); }, 10 * 60 * 1000);
              }).catch(function() {});
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
