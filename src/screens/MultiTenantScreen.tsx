'use client';
import React, { useState, useCallback } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useTenant } from '@/hooks/useDomain';
import { confirm } from '@/hooks/useConfirmDialog';
import { getFirebase, serverTimestamp } from '@/lib/firebase-service';
import {
  createTenant, updateTenant, deleteTenant, formatStorageMB, getDefaultLimits, getEmptyStats,
} from '@/lib/tenant-service';
import { TENANT_PLAN_LIMITS, ADMIN_EMAILS } from '@/lib/types';
import type { Tenant, TenantPlan, TenantSettings } from '@/lib/types';
import {
  Building2, Users, Shield, Crown, Settings, Globe, ArrowRight, Plus, Trash2, Pencil,
  Check, X, Loader2, Database, HardDrive, FolderOpen, AlertTriangle, Zap, Layers,
} from 'lucide-react';

/* ===== PLAN BADGE ===== */
function PlanBadge({ plan }: { plan: TenantPlan }) {
  const cfg = TENANT_PLAN_LIMITS[plan];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${
      plan === 'free' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
      plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
    }`}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

/* ===== TENANT CARD ===== */
function TenantCard({
  tenant, isSelected, isSuperAdmin, onSwitch, onEdit, onDelete,
}: {
  tenant: Tenant;
  isSelected: boolean;
  isSuperAdmin: boolean;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { stats, limits } = tenant.data;
  const isUnlimited = limits.maxProjects === -1;

  return (
    <div className={`card-elevated rounded-xl p-4 transition-all ${isSelected ? 'border-2 border-[var(--af-accent)] shadow-lg' : 'hover:border-[var(--af-accent)]/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--af-bg4)] text-lg">
            {tenant.data.logo ? (
              <img src={tenant.data.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <Building2 size={20} className="text-[var(--af-accent)]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{tenant.data.name}</div>
            {tenant.data.domain && (
              <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                <Globe size={10} /> {tenant.data.domain}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PlanBadge plan={tenant.data.plan} />
          {isSelected && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)] font-semibold border border-[var(--af-accent)]/30">
              Activo
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <FolderOpen size={12} className="text-[var(--muted-foreground)]" />
            <span className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Proyectos</span>
          </div>
          <div className="text-sm font-bold">{stats.projectCount}{!isUnlimited && <span className="text-[10px] text-[var(--muted-foreground)] font-normal">/{limits.maxProjects}</span>}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users size={12} className="text-[var(--muted-foreground)]" />
            <span className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Usuarios</span>
          </div>
          <div className="text-sm font-bold">{stats.userCount}{!isUnlimited && <span className="text-[10px] text-[var(--muted-foreground)] font-normal">/{limits.maxUsers}</span>}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <HardDrive size={12} className="text-[var(--muted-foreground)]" />
            <span className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Storage</span>
          </div>
          <div className="text-sm font-bold">{formatStorageMB(stats.storageUsed)}{!isUnlimited && <span className="text-[10px] text-[var(--muted-foreground)] font-normal">/{formatStorageMB(limits.maxStorage)}</span>}</div>
        </div>
      </div>

      {/* Progress Bars */}
      {!isUnlimited && (
        <div className="mt-3 space-y-2">
          {[
            { label: 'Proyectos', current: stats.projectCount, max: limits.maxProjects },
            { label: 'Usuarios', current: stats.userCount, max: limits.maxUsers },
            { label: 'Storage', current: stats.storageUsed, max: limits.maxStorage },
          ].map(item => {
            const pct = Math.min((item.current / item.max) * 100, 100);
            const isNear = pct >= 80;
            const isFull = pct >= 100;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--muted-foreground)] w-14 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-[var(--skeuo-inset)] shadow-[var(--skeuo-shadow-inset-sm)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : isNear ? 'bg-amber-400' : 'bg-[var(--af-accent)]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium w-8 text-right ${isFull ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
        {!isSelected && isSuperAdmin && (
          <button
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-[var(--af-accent)] text-background hover:opacity-90 transition-all"
            onClick={onSwitch}
          >
            <ArrowRight size={12} /> Cambiar
          </button>
        )}
        <button
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer skeuo-btn text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all"
          onClick={onEdit}
        >
          <Pencil size={12} /> Editar
        </button>
        {isSuperAdmin && (
          <button
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
            onClick={onDelete}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ===== CREATE/EDIT TENANT MODAL ===== */
function TenantModal({
  mode, tenant, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  tenant?: Tenant;
  onClose: () => void;
  onSave: (data: { name: string; domain: string; plan: TenantPlan; logo?: string }) => void;
}) {
  const [name, setName] = useState(tenant?.data.name || '');
  const [domain, setDomain] = useState(tenant?.data.domain || '');
  const [plan, setPlan] = useState<TenantPlan>(tenant?.data.plan || 'free');
  const [logo, setLogo] = useState(tenant?.data.logo || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), domain: domain.trim(), plan, logo });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative card-elevated rounded-2xl p-6 w-full max-w-md animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 size={20} className="text-[var(--af-accent)]" />
            {mode === 'create' ? 'Nuevo Tenant' : 'Editar Tenant'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer bg-transparent border-none">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold block mb-1.5">Nombre</label>
            <input
              className="w-full skeuo-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Nombre de la organización"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Domain */}
          <div>
            <label className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold block mb-1.5">Dominio</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                className="w-full skeuo-input rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
                placeholder="ej: acme.archiflow.app"
                value={domain}
                onChange={e => setDomain(e.target.value)}
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold block mb-1.5">Logo URL</label>
            <input
              className="w-full skeuo-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="https://ejemplo.com/logo.png"
              value={logo}
              onChange={e => setLogo(e.target.value)}
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold block mb-1.5">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TENANT_PLAN_LIMITS) as TenantPlan[]).map(p => {
                const cfg = TENANT_PLAN_LIMITS[p];
                const isSelected = plan === p;
                return (
                  <button
                    key={p}
                    className={`p-3 rounded-xl text-center cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-[var(--af-accent)] bg-[var(--af-accent)]/5 shadow-md'
                        : 'border-[var(--border)] hover:border-[var(--af-accent)]/40'
                    }`}
                    onClick={() => setPlan(p)}
                  >
                    <div className="text-xl mb-1">{cfg.icon}</div>
                    <div className={`text-xs font-semibold ${isSelected ? 'text-[var(--af-accent)]' : 'text-[var(--foreground)]'}`}>{cfg.label}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)] mt-1">
                      {cfg.maxProjects === -1 ? 'Ilimitado' : `${cfg.maxProjects} proyectos`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer skeuo-btn text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer bg-[var(--af-accent)] text-background hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {mode === 'create' ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== MAIN SCREEN ===== */
export default function MultiTenantScreen() {
  const { showToast } = useUI();
  const { authUser, isAdmin, isEmailAdmin } = useAuth();
  const { currentTenantId, tenants, currentTenant, isSuperAdmin, switchingTenant, switchTenant, loadTenants, refreshCurrentTenant } = useTenant();

  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<'tenants' | 'branding' | 'plans'>('tenants');

  // Only super-admins (ADMIN_EMAILS) can access the multi-tenant screen
  const canAccess = isEmailAdmin;

  // ===== Handlers =====
  const handleCreateTenant = useCallback(async (data: { name: string; domain: string; plan: TenantPlan; logo?: string }) => {
    if (!authUser) return;
    try {
      await createTenant(data.name, data.domain, data.plan, authUser.uid, data.logo);
      showToast(`Tenant "${data.name}" creado exitosamente`);
      loadTenants();
    } catch (err) {
      console.error('[MultiTenant] Create failed:', err);
      showToast('Error al crear tenant', 'error');
    }
  }, [authUser, showToast, loadTenants]);

  const handleUpdateTenant = useCallback(async (data: { name: string; domain: string; plan: TenantPlan; logo?: string }) => {
    if (!editTenant) return;
    try {
      await updateTenant(editTenant.id, data);
      showToast(`Tenant "${data.name}" actualizado`);
      setEditTenant(null);
      setShowModal(false);
      await refreshCurrentTenant();
    } catch (err) {
      console.error('[MultiTenant] Update failed:', err);
      showToast('Error al actualizar tenant', 'error');
    }
  }, [editTenant, showToast, refreshCurrentTenant]);

  const handleDeleteTenant = useCallback(async (tenant: Tenant) => {
    if (!(await confirm({
      title: 'Eliminar Tenant',
      description: `¿Eliminar "${tenant.data.name}"? Esta acción eliminará todos los datos asociados (proyectos, tareas, etc.) y NO se puede deshacer.`,
      confirmText: 'Eliminar permanentemente',
      variant: 'destructive',
    }))) return;

    try {
      await deleteTenant(tenant.id);
      showToast(`Tenant "${tenant.data.name}" eliminado`);
    } catch (err) {
      console.error('[MultiTenant] Delete failed:', err);
      showToast('Error al eliminar tenant', 'error');
    }
  }, [showToast]);

  const handleSwitchTenant = useCallback(async (tenantId: string) => {
    await switchTenant(tenantId);
  }, [switchTenant]);

  const openEdit = useCallback((tenant: Tenant) => {
    setEditTenant(tenant);
    setShowModal(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditTenant(null);
    setShowModal(true);
  }, []);

  // ===== RESTRICTED ACCESS =====
  if (!canAccess) {
    return (
      <div className="animate-fadeIn p-6 text-center">
        <div className="w-14 h-14 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-3">
          <Shield size={28} className="text-[var(--af-text3)]" />
        </div>
        <div className="text-lg font-semibold">Acceso restringido</div>
        <div className="text-sm text-[var(--muted-foreground)] mt-1">
          Solo super-administradores pueden gestionar tenants
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="animate-fadeIn p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 size={20} className="text-[var(--af-accent)]" />
            Multi-Tenant
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Gestiona organizaciones con datos aislados. {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} configurados.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer bg-[var(--af-accent)] text-background hover:opacity-90 transition-all shadow-[var(--skeuo-shadow-btn)]"
          onClick={openCreate}
        >
          <Plus size={16} /> Nuevo Tenant
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 skeuo-well rounded-xl p-1 w-fit mb-5 overflow-x-auto">
        {([
          { id: 'tenants' as const, label: 'Organizaciones', icon: <Building2 size={14} /> },
          { id: 'branding' as const, label: 'Branding', icon: <Settings size={14} /> },
          { id: 'plans' as const, label: 'Planes', icon: <Crown size={14} /> },
        ]).map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] font-semibold shadow-[var(--skeuo-shadow-btn)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TENANTS TAB ===== */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Current Tenant Indicator */}
          {currentTenant && (
            <div className="card-glass rounded-xl p-4 border border-[var(--af-accent)]/20 bg-[var(--af-accent)]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--af-accent)]/10">
                  {currentTenant.data.logo ? (
                    <img src={currentTenant.data.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Building2 size={20} className="text-[var(--af-accent)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">Tenant Activo</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{currentTenant.data.name} · <PlanBadge plan={currentTenant.data.plan} /></div>
                </div>
                {switchingTenant && <Loader2 size={16} className="animate-spin text-[var(--af-accent)]" />}
              </div>
            </div>
          )}

          {/* Tenant List */}
          {tenants.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-3">
                <Layers size={24} className="text-[var(--af-text3)]" />
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">No hay tenants creados</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                Crea tu primera organización para comenzar
              </div>
              <button
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer bg-[var(--af-accent)] text-background hover:opacity-90 transition-all"
                onClick={openCreate}
              >
                <Plus size={14} className="inline mr-1" /> Crear Tenant
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {tenants.map(t => (
                <TenantCard
                  key={t.id}
                  tenant={t}
                  isSelected={t.id === currentTenantId}
                  isSuperAdmin={isSuperAdmin}
                  onSwitch={() => handleSwitchTenant(t.id)}
                  onEdit={() => openEdit(t)}
                  onDelete={() => handleDeleteTenant(t)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== BRANDING TAB ===== */}
      {activeTab === 'branding' && (
        <div className="space-y-4">
          <div className="card-elevated rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Settings size={16} className="text-[var(--af-accent)]" />
              Branding del Tenant Actual
            </h3>
            {currentTenant ? (
              <div className="space-y-4">
                {/* Preview */}
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--af-bg2)]">
                  <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-semibold mb-2">Vista Previa</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--af-bg4)] flex items-center justify-center" style={{ backgroundColor: currentTenant.data.settings.primaryColor || undefined }}>
                      {currentTenant.data.settings.customLogo ? (
                        <img src={currentTenant.data.settings.customLogo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : currentTenant.data.logo ? (
                        <img src={currentTenant.data.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <Building2 size={20} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{currentTenant.data.name}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]" style={{ color: currentTenant.data.settings.secondaryColor || undefined }}>
                        Personalización de marca activa
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="text-xs text-[var(--muted-foreground)] space-y-1">
                  <p>El branding se aplica automáticamente al tenant activo: {currentTenant.data.name}</p>
                  <p>Usa la sección de <strong>Editar</strong> en la pestaña Organizaciones para modificar colores y logo personalizado.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                No hay tenant activo seleccionado
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PLANS TAB ===== */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(TENANT_PLAN_LIMITS) as TenantPlan[]).map(plan => {
              const cfg = TENANT_PLAN_LIMITS[plan];
              const isCurrentPlan = currentTenant?.data.plan === plan;
              return (
                <div key={plan} className={`card-elevated rounded-xl p-5 transition-all ${isCurrentPlan ? 'border-2 border-[var(--af-accent)]' : ''}`}>
                  <div className="text-center mb-4">
                    <div className="text-3xl mb-2">{cfg.icon}</div>
                    <div className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><FolderOpen size={14} /> Proyectos</span>
                      <span className="font-semibold">{cfg.maxProjects === -1 ? 'Ilimitados' : cfg.maxProjects}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><Users size={14} /> Usuarios</span>
                      <span className="font-semibold">{cfg.maxUsers === -1 ? 'Ilimitados' : cfg.maxUsers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><HardDrive size={14} /> Almacenamiento</span>
                      <span className="font-semibold">{cfg.maxStorage === -1 ? 'Ilimitado' : formatStorageMB(cfg.maxStorage)}</span>
                    </div>
                  </div>
                  {isCurrentPlan && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)] text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--af-accent)]/10 text-[var(--af-accent)] font-semibold border border-[var(--af-accent)]/30">
                        Plan Actual
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <TenantModal
          mode={editTenant ? 'edit' : 'create'}
          tenant={editTenant || undefined}
          onClose={() => { setShowModal(false); setEditTenant(null); }}
          onSave={editTenant ? handleUpdateTenant : handleCreateTenant}
        />
      )}
    </div>
  );
}
