'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UIProvider from '@/contexts/UIContext';
import AuthProvider from '@/contexts/AuthContext';
import TenantProvider from '@/contexts/TenantContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { AppProviders } from '@/components/layout/AppProviders';
import { CheckCircle2, Loader2, ArrowLeft, LogIn, Building2 } from 'lucide-react';

/* ================================================================
   JoinPageContent — inner component wrapped in all providers
   ================================================================ */
function JoinPageContent() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { authUser, loading: authLoading } = useAuthContext();
  const { joinTenantByCode } = useTenantContext();

  const code = (params.code || '').toUpperCase();

  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Auto-join when authenticated and code is valid
  const handleJoin = useCallback(async () => {
    if (!code || code.length !== 6 || joining || joined) return;
    setJoining(true);
    setError(null);
    try {
      await joinTenantByCode(code);
      if (mountedRef.current) {
        setJoined(true);
        // Redirect after a short delay to show success
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
  }, [code, joining, joined, joinTenantByCode, router]);

  // Auto-trigger join once auth is resolved
  useEffect(() => {
    if (authUser && !authLoading && code.length === 6 && !joining && !joined) {
      handleJoin();
    }
  }, [authUser, authLoading, code, joining, joined, handleJoin]);

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
            Se te invita a unirte con el siguiente código
          </p>

          {/* Code display */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--skeuo-inset)] border border-[var(--skeuo-edge-dark)] rounded-xl shadow-[var(--skeuo-shadow-inset-sm)]">
              <span className="text-3xl font-mono font-bold tracking-[0.25em] text-[var(--af-accent)]">
                {code}
              </span>
            </div>
          </div>

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

  // ── Authenticated — joining / joined / error ──
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
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 animate-[scaleIn_0.3s_ease-out]">
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
                {joining ? (
                  <Loader2 className="w-8 h-8 text-[var(--af-accent)] animate-spin" />
                ) : (
                  <Building2 className="w-8 h-8 text-[var(--af-accent)]" />
                )}
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-xl font-semibold text-center mb-1">Únete a una Organización</h1>
            <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
              {joining ? 'Uniéndote a la organización...' : 'Confirma para unirte a esta organización'}
            </p>

            {/* Code display */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--skeuo-inset)] border border-[var(--skeuo-edge-dark)] rounded-xl shadow-[var(--skeuo-shadow-inset-sm)]">
                <span className="text-3xl font-mono font-bold tracking-[0.25em] text-[var(--af-accent)]">
                  {code}
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Join button (shown when not auto-joined yet) */}
            {!joining && !joined && (
              <button
                onClick={handleJoin}
                className="w-full bg-gradient-to-r from-[var(--af-accent)] to-[var(--af-accent2)] text-background border-none rounded-lg py-3 text-sm font-semibold cursor-pointer shadow-[var(--skeuo-shadow-btn)] transition-all duration-200 hover:shadow-[0_4px_15px_rgba(158,124,62,0.3)] hover:scale-[1.02] active:shadow-[var(--skeuo-shadow-btn-active)] active:translate-y-[1px] flex items-center justify-center gap-2"
              >
                Unirme
              </button>
            )}

            {/* Loading state */}
            {joining && (
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Page — wraps content in the full provider chain
   ================================================================ */
export default function JoinCodePage() {
  return (
    <UIProvider>
      <AuthProvider>
        <TenantProvider>
          <JoinPageContent />
        </TenantProvider>
      </AuthProvider>
      <AppProviders />
    </UIProvider>
  );
}
