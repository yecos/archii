'use client';
import React, { useState, useMemo } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  Building2, ArrowRight, LogOut, QrCode, RefreshCw,
  Users, ChevronRight, Sparkles, Shield, Loader2,
} from 'lucide-react';
import { ADMIN_EMAILS } from '@/lib/types';
import type { TenantMembership } from '@/lib/types';

export default function TenantSelectionScreen() {
  const {
    userMemberships,
    tenants,
    selectTenant,
    joinTenantByCode,
    leaveTenant,
    switchingTenant,
    isSuperAdmin,
  } = useTenantContext();
  const { authUser } = useAuthContext();

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState('');
  const [showQR, setShowQR] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);

  // Merge membership data with tenant data for rich display
  const enrichedMemberships = useMemo(() => {
    return userMemberships.map(m => {
      const tenant = tenants.find(t => t.id === m.tenantId);
      return {
        membership: m,
        tenant: tenant || null,
      };
    });
  }, [userMemberships, tenants]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(joinCode.trim());
    try {
      await joinTenantByCode(joinCode.trim());
      setJoinCode('');
      setShowJoinForm(false);
    } finally {
      setJoining('');
    }
  };

  const handleLeave = async (tenantId: string) => {
    await leaveTenant(tenantId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  // Determine join URL for QR
  const getJoinURL = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/join?code=${code}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Selecciona tu Organización</h1>
          <p className="text-slate-400 text-sm">
            {userMemberships.length === 0
              ? 'Únete a una organización con un código de acceso'
              : 'Elige a qué organización deseas ingresar'}
          </p>
        </div>

        {/* Tenant Cards */}
        {enrichedMemberships.length > 0 && (
          <div className="space-y-3 mb-6">
            {enrichedMemberships.map(({ membership, tenant }) => (
              <div
                key={membership.tenantId}
                className="group bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  {/* Tenant logo or default */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                    {tenant?.data?.logo ? (
                      <img src={tenant.data.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-blue-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">
                        {tenant?.data?.name || 'Organización'}
                      </h3>
                      {membership.role === 'Admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    {tenant?.data?.plan && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        Plan {tenant.data.plan.charAt(0).toUpperCase() + tenant.data.plan.slice(1)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Show QR button (admin of this tenant) */}
                    {tenant?.data?.joinCode && (
                      <button
                        onClick={() => setShowQR(showQR === membership.tenantId ? null : membership.tenantId)}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Mostrar código QR"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    )}
                    {/* Select button */}
                    <button
                      onClick={() => selectTenant(membership.tenantId)}
                      disabled={switchingTenant}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {switchingTenant ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Ingresar
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    {/* Leave button (only if multiple memberships) */}
                    {userMemberships.length > 1 && (
                      <button
                        onClick={() => handleLeave(membership.tenantId)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Salir de esta organización"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code expansion */}
                {showQR === membership.tenantId && tenant?.data?.joinCode && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-white p-3 rounded-xl">
                        <QRCodeSVG
                          value={getJoinURL(tenant.data.joinCode!)}
                          size={160}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">Código de acceso</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/80 rounded-lg">
                          <code className="text-white font-mono text-lg tracking-widest">
                            {tenant.data.joinCode}
                          </code>
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs">
                        Comparte este código o QR con nuevos miembros
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Divider or join section */}
        {enrichedMemberships.length > 0 && !showJoinForm && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50" />
            </div>
            <div className="relative flex justify-center">
              <button
                onClick={() => setShowJoinForm(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 border border-slate-700/50 rounded-full text-slate-400 text-xs hover:text-white hover:border-slate-600 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Unirse a otra organización
              </button>
            </div>
          </div>
        )}

        {/* Join by code form */}
        {(showJoinForm || enrichedMemberships.length === 0) && (
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold text-sm">
                {enrichedMemberships.length === 0
                  ? 'Unirse con un código de acceso'
                  : 'Unirse a una nueva organización'}
              </h3>
            </div>

            <p className="text-slate-400 text-xs mb-4">
              Pide el código de acceso a un administrador de tu organización.
              El código tiene 6 caracteres (ej: <span className="text-slate-300 font-mono">ABC123</span>).
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={handleKeyDown}
                placeholder="ABC123"
                maxLength={6}
                className="flex-1 px-4 py-2.5 bg-slate-900/80 border border-slate-600 rounded-lg text-white font-mono text-center text-lg tracking-[0.3em] placeholder:tracking-widest placeholder:text-slate-600 placeholder:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all uppercase"
                disabled={!!joining}
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || !!joining}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
          </div>
        )}

        {/* Super admin hint */}
        {isSuperAdmin && enrichedMemberships.length === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Como super-admin, puedes crear organizaciones desde el panel de Multitenant después de ingresar.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">
            {authUser?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
