'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Archii]', error);
  }, [error]);

  return (
    <div
      className="animate-fadeIn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: 'var(--background)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        {/* Logo */}
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '1.75rem',
            color: 'var(--af-accent)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          Archii
        </h1>

        {/* Divider */}
        <div
          style={{
            width: '40px',
            height: '2px',
            background: 'var(--border)',
            marginBottom: '2rem',
            borderRadius: '1px',
          }}
        />

        {/* Warning Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--af-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        {/* Heading */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            marginBottom: '0.5rem',
            lineHeight: 1.3,
          }}
        >
          Algo salió mal
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)',
            marginBottom: '0.5rem',
            lineHeight: 1.5,
            maxWidth: '320px',
          }}
        >
          Intenta recargar la página
        </p>

        {/* Error message */}
        {error.message && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--af-red)',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '0.625rem 1rem',
              marginBottom: '1.5rem',
              maxWidth: '100%',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              lineHeight: 1.5,
            }}
          >
            {error.message}
          </p>
        )}

        {/* Retry Button */}
        <button
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.75rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#fff',
            background: 'var(--af-accent)',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--af-accent2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--af-accent)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
        >
          {/* Refresh icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          Reintentar
        </button>
      </div>
    </div>
  );
}
