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
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://*.graph.facebook.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://www.gstatic.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://accounts.google.com https://graph.facebook.com https://login.microsoftonline.com https://login.live.com https://id.live.com wss://*.firebaseio.com https://firestore.googleapis.com https://graph.microsoft.com; frame-src https://accounts.google.com https://login.microsoftonline.com https://*.google.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
