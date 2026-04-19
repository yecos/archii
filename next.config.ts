import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['firebase-admin', 'sharp'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // SAMEORIGIN permite iframes del mismo origen (necesario para Firebase Auth)
          // DENY bloqueaba los iframes intermedios de Firebase Auth en popups OAuth
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Se mantiene permisos pero sin bloquear completamente (algunos flujos OAuth en móvil los necesitan)
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              // default-src: fuentes permitidas por defecto
              "default-src 'self';",
              // script-src: scripts del SDK Firebase, Google Maps, y UUID CDN
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "  https://www.gstatic.com",
              "  https://*.googleapis.com",
              "  https://cdn.jsdelivr.net;",
              // style-src: fuentes de Google y estilos inline de Firebase
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              // font-src: fuentes de Google
              "font-src 'self' https://fonts.gstatic.com;",
              // img-src: imágenes de perfiles, storage, y favicons
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://*.graph.facebook.com https://*.googleapis.com;",
              // connect-src: endpoints de Firebase Auth, Firestore, Google, Microsoft OAuth
              "connect-src 'self'",
              "  https://*.firebaseio.com",
              "  https://*.googleapis.com",
              "  https://www.gstatic.com",
              "  https://securetoken.googleapis.com",
              "  https://identitytoolkit.googleapis.com",
              "  https://accounts.google.com",
              "  https://graph.facebook.com",
              "  https://login.microsoftonline.com",
              "  https://login.live.com",
              "  https://id.live.com",
              "  https://aadcdn.msauth.net",
              "  https://aadcdn.msftauth.net",
              "  wss://*.firebaseio.com",
              "  https://firestore.googleapis.com",
              "  https://graph.microsoft.com;",
              // frame-src: iframes para OAuth popups (Google, Microsoft, Firebase)
              // CRITICAL: *.firebaseapp.com es necesario para los iframes intermedios de Firebase Auth
              "frame-src 'self'",
              "  https://accounts.google.com",
              "  https://login.microsoftonline.com",
              "  https://login.live.com",
              "  https://*.google.com",
              "  https://*.firebaseapp.com",
              "  https://*.firebaseio.com;",
            ].join(' '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
