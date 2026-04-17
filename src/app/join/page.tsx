'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import UIProvider from '@/contexts/UIContext';
import AuthProvider from '@/contexts/AuthContext';
import TenantProvider from '@/contexts/TenantContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { AppProviders } from '@/components/layout/AppProviders';
import { ArrowLeft, LogIn, Building2, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';

/* ================================================================
   JoinIndexContent — inner component wrapped in all providers
   ================================================================ */
function JoinIndexContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { authUser, loading: authLoading } = useAuthContext();
  const { joinTenantByCode } = useTenantContext();

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // If ?code= query param exists, redirect to /join/[code]
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam && codeParam.trim().length > 0) {
      router.replace(`/join/${codeParam.trim().toUpperCase()}`);
    }
  }, [searchParams, router]);

  const handleJoin = useCallback(async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 6 || joining || joined) return;
    setJoining(true);
    setError(null);
    try {
      await joinTenantByCode(trimmed);
      if (mountedRef.current) {
        setJoined(true);
        setTimeout(() => {
          if (mountedRef.current) {
            router.push('/');
          }
        }, 1800);
      }
    } catch {
      if (mountedRef.current) {
        setError('Error al unirse a la organización');
      }
    } finally {
      if (mountedRef.current) {
        setJoining(false);
      }
    }
  }, [joinCode, joining, joined, joinTenantByCode, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  const codeParam = searchParams.get('code');
  // While redirecting for code param, show nothing
  if (codeParam && codeParam.trim().length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-br from-[var(--background)] via-[var(--af-bg3)] to-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--af-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--muted-foreground)]">Redirigiendo...</span>
        </div>
      </div>
    );
  }

  // ── Auth loading state ──
  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-br from-[var(--background)] via-[var(--af-bg3)] to-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--af-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--muted-foreground)]">Cargando...</span>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!authUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-br from-[var(--background)] via-[var(--af-bg3)] to-[var(--background)]">
        <div className="relative overflow-hidden card-glass rounded-2xl p-8 w-full max-w-[420px] shadow-xl border border-[var(--input)]">
          {/* Top gradient accent */}
          <div className="absolute top-0 inset-x-0 h-1 rounded-t-2xl bg-gradient-to-r from-[var(--af-accent)] via-[var(--af-accent2)] to-[var(--af-accent)] opacity-60" />

          {/* Branding */}
          <div className="flex flex-col items-center mb-7">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-[var(--af-accent)] rounded-lg flex items-center justify-center shadow-[0_0_30px_rgba(158,124,62,0.2)]">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl">ArchiFlow</span>
            </div>
            <div className="w-12 h-0.5 bg-[var(--af-accent)]/40 mx-auto mt-2" />
          </div>

          {/* Icon */}
          <div className="flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] flex items-center justify-center">
              <Building2 className="w-8 h-8 text-[var(--af-accent)]" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-xl font-semibold text-center mb-1">Únete a una Organización</h1>
          <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
            Ingresa el código de acceso que te compartió un administrador
          </p>

          {/* Login prompt */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-[var(--muted-foreground)] text-sm">
              <LogIn className="w-4 h-4" />
              <span>Inicia sesión para continuar</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[var(--af-accent)] to-[var(--af-accent2)] text-background rounded-lg text-sm font-semibold cursor-pointer shadow-[var(--skeuo-shadow-btn)] transition-all duration-200 hover:shadow-[0_4px_15px_rgba(158,124,62,0.3)] hover:scale-[1.02] active:shadow-[var(--skeuo-shadow-btn-active)] active:translate-y-[1px]"
            >
              <LogIn className="w-4 h-4" />
              Ir a iniciar sesión
            </button>
          </div>

          {/* Back link */}
          <div className="text-center mt-5">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated — join form ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-br from-[var(--background)] via-[var(--af-bg3)] to-[var(--background)]">
      <div className="relative overflow-hidden card-glass rounded-2xl p-8 w-full max-w-[420px] shadow-xl border border-[var(--input)]">
        {/* Top gradient accent */}
        <div className="absolute top-0 inset-x-0 h-1 rounded-t-2xl bg-gradient-to-r from-[var(--af-accent)] via-[var(--af-accent2)] to-[var(--af-accent)] opacity-60" />

        {/* Branding */}
        <div className="flex flex-col items-center mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[var(--af-accent)] rounded-lg flex items-center justify-center shadow-[0_0_30px_rgba(158,124,62,0.2)]">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl">ArchiFlow</span>
          </div>
          <div className="w-12 h-0.5 bg-[var(--af-accent)]/40 mx-auto mt-2" />
        </div>

        {/* Joined state */}
        {joined ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-emerald-400 mb-1">¡Te has unido!</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Redirigiendo a tu organización...</p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] shadow-[var(--skeuo-shadow-raised-sm)] flex items-center justify-center">
                <Building2 className="w-8 h-8 text-[var(--af-accent)]" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-xl font-semibold text-center mb-1">Únete a una Organización</h1>
            <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
              Ingresa el código de acceso que te compartió un administrador
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Code input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={handleKeyDown}
                placeholder="ABC123"
                maxLength={6}
                disabled={joining}
                className="flex-1 w-full bg-[var(--skeuo-inset)] border border-[var(--skeuo-edge-dark)] rounded-lg px-4 py-3 text-center text-xl font-mono font-bold tracking-[0.25em] text-[var(--foreground)] outline-none transition-all shadow-[var(--skeuo-shadow-inset-sm)] focus:border-[rgba(var(--af-accent-rgb),0.4)] focus:shadow-[var(--skeuo-shadow-inset),0_0_0_2px_rgba(var(--af-accent-rgb),0.2)] placeholder:tracking-[0.2em] placeholder:text-[var(--muted-foreground)] placeholder:text-sm placeholder:font-normal placeholder:font-sans disabled:opacity-50 uppercase"
              />
              <button
                onClick={handleJoin}
                disabled={joinCode.trim().length !== 6 || joining}
                className="px-5 py-3 bg-gradient-to-r from-[var(--af-accent)] to-[var(--af-accent2)] text-background rounded-lg text-sm font-semibold cursor-pointer shadow-[var(--skeuo-shadow-btn)] transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_4px_15px_rgba(158,124,62,0.3)] hover:scale-[1.02] active:shadow-[var(--skeuo-shadow-btn-active)] active:translate-y-[1px]"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Unirme
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[var(--muted-foreground)] text-center mb-5">
              El código tiene 6 caracteres (letras y números)
            </p>

            {/* Back link */}
            <div className="text-center">
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                Volver al inicio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Page — wraps content in the full provider chain
   ================================================================ */
export default function JoinIndexPage() {
  return (
    <UIProvider>
      <Suspense fallback={null}>
        <AuthProvider>
          <TenantProvider>
            <JoinIndexContent />
          </TenantProvider>
        </AuthProvider>
      </Suspense>
      <AppProviders />
    </UIProvider>
  );
}
