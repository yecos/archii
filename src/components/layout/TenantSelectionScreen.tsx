'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getAuthHeaders } from '@/lib/firebase-service';
import { Building2, Plus, ArrowRight, Users, Copy, Check, Sparkles, ChevronDown } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  code: string;
  members?: string[];
  createdBy?: string;
  createdAt?: any;
}

export default function TenantSelectionScreen() {
  const { authUser, switchTenant, showToast, userName } = useApp();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Load user's tenants
  const loadTenants = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      if (data.tenants) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error('[TenantSelection] Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Auto-select if only one tenant exists
  useEffect(() => {
    if (tenants.length === 1 && !showCreate && !showJoin) {
      const t = tenants[0];
      switchTenant(t.id, t.name);
    }
  }, [tenants.length, showCreate, showJoin, tenants, switchTenant]);

  const handleCreate = async () => {
    const name = newTenantName.trim();
    if (name.length < 2) {
      showToast('El nombre debe tener al menos 2 caracteres', 'error');
      return;
    }
    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }
      showToast(`Espacio "${data.name}" creado — Código: ${data.code}`);
      switchTenant(data.tenantId, data.name);
    } catch (err) {
      console.error('[TenantSelection] Create error:', err);
      showToast('Error al crear espacio', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setJoinError('Ingresa un código válido');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code }),
      });
      const data = await res.json();
      if (data.error) {
        setJoinError(data.error);
        return;
      }
      if (data.alreadyMember) {
        showToast(`Ya eres miembro de "${data.name}"`);
      } else {
        showToast(`Te uniste a "${data.name}"`);
      }
      switchTenant(data.tenantId, data.name);
    } catch (err) {
      console.error('[TenantSelection] Join error:', err);
      setJoinError('Error al unirse al espacio');
    } finally {
      setJoining(false);
    }
  };

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const selectTenant = (t: Tenant) => {
    switchTenant(t.id, t.name);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--background)] z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--af-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--muted-foreground)]">Cargando espacios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--af-bg3)] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="af-ambient-bg" />

      <div className="relative w-full max-w-[480px] my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-[var(--af-accent)] to-[var(--af-accent2)] rounded-2xl shadow-lg af-glow-accent flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="stroke-background" />
          </div>
          <h1 className="text-2xl font-bold af-heading">Bienvenido, {userName.split(' ')[0]}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Selecciona o crea un espacio de trabajo para comenzar
          </p>
        </div>

        {/* Existing tenants */}
        {tenants.length > 0 && !showCreate && !showJoin && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Tus espacios</span>
              <span className="text-xs text-[var(--muted-foreground)]">{tenants.length} espacio{tenants.length !== 1 ? 's' : ''}</span>
            </div>
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTenant(t)}
                className="w-full af-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--af-accent)]/40 transition-all group text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--af-accent)]/20 to-[var(--af-accent2)]/10 flex items-center justify-center flex-shrink-0 group-hover:from-[var(--af-accent)]/30 group-hover:to-[var(--af-accent2)]/20 transition-all">
                  <Building2 size={20} className="stroke-[var(--af-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{t.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[var(--muted-foreground)] font-mono bg-[var(--af-bg3)] px-2 py-0.5 rounded-md">{t.code}</span>
                    <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                      <Users size={10} />
                      {t.members?.length || 1} miembro{(t.members?.length || 1) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => copyCode(t.code, e)}
                    className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg4)] transition-all"
                    title="Copiar código"
                  >
                    {copiedCode === t.code ? (
                      <Check size={14} className="stroke-emerald-400" />
                    ) : (
                      <Copy size={14} className="stroke-[var(--muted-foreground)]" />
                    )}
                  </button>
                  <ArrowRight size={18} className="stroke-[var(--muted-foreground)] group-hover:stroke-[var(--af-accent)] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {!showCreate && !showJoin && (
          <div className="space-y-3">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full af-btn-primary flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all border-none"
            >
              <Plus size={18} className="stroke-current" strokeWidth={2.5} />
              Crear nuevo espacio
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="w-full af-btn-secondary flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            >
              <Sparkles size={16} className="stroke-current" />
              Unirme con un código
            </button>
          </div>
        )}

        {/* Create tenant form */}
        {showCreate && (
          <div className="af-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">Crear espacio de trabajo</h2>
              <button
                onClick={() => { setShowCreate(false); setNewTenantName(''); }}
                className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] bg-transparent border-none"
              >
                Cancelar
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Crea un espacio para tu equipo. Se generará un código de invitación único para que otros puedan unirse.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre del espacio</label>
              <input
                className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--af-accent)]"
                placeholder="Ej: Constructora ABC, Arquitectura XYZ..."
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
                disabled={creating}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || newTenantName.trim().length < 2}
              className={`w-full af-btn-primary flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all border-none ${creating || newTenantName.trim().length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={16} className="stroke-current" strokeWidth={2.5} />
              )}
              {creating ? 'Creando...' : 'Crear espacio'}
            </button>
          </div>
        )}

        {/* Join tenant form */}
        {showJoin && (
          <div className="af-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">Unirme con código</h2>
              <button
                onClick={() => { setShowJoin(false); setJoinCode(''); setJoinError(''); }}
                className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] bg-transparent border-none"
              >
                Cancelar
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Ingresa el código de invitación de 6 caracteres que te compartió un miembro del espacio.
            </p>
            <div className="mb-2">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Código de invitación</label>
              <input
                className={`w-full bg-[var(--af-bg3)] border rounded-lg px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition-colors text-center font-mono text-lg tracking-[0.3em] uppercase ${joinError ? 'border-[var(--destructive)]' : 'border-[var(--input)] focus:border-[var(--af-accent)]'}`}
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setJoinError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                maxLength={6}
                autoFocus
                disabled={joining}
              />
              {joinError && (
                <p className="text-xs mt-1.5 text-[var(--destructive)]">{joinError}</p>
              )}
            </div>
            <button
              onClick={handleJoin}
              disabled={joining || joinCode.trim().length < 4}
              className={`w-full af-btn-primary flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all border-none ${joining || joinCode.trim().length < 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {joining ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={16} className="stroke-current" />
              )}
              {joining ? 'Uniéndome...' : 'Unirme al espacio'}
            </button>
          </div>
        )}

        {/* Bottom info */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Cada espacio es completamente independiente. Los proyectos, tareas, gastos y demás datos están aislados entre espacios.
          </p>
        </div>
      </div>
    </div>
  );
}
