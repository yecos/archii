'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from './AuthContext';
import { useUIContext } from './UIContext';
import { getFirebase, serverTimestamp, snapToDocs, type QuerySnapshot } from '@/lib/firebase-service';
import { detectTenantFromDomain, fetchTenantByDomain } from '@/lib/tenant-service';
import type { Tenant, TenantPlan, TenantMembership, TeamUser } from '@/lib/types';
import { ADMIN_EMAILS } from '@/lib/types';

/* ===== TENANT CONTEXT ===== */
interface TenantContextType {
  // State
  currentTenantId: string | null;
  setCurrentTenantId: React.Dispatch<React.SetStateAction<string | null>>;
  tenants: Tenant[];
  currentTenant: Tenant | null;
  userMemberships: TenantMembership[];
  tenantTeamUsers: TeamUser[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  switchingTenant: boolean;
  /** True when user is logged in but has no tenant selected (needs to select or join) */
  needsTenantSelection: boolean;
  /** Loading state while resolving tenant after login */
  isResolvingTenant: boolean;

  // Actions
  loadTenants: () => void;
  selectTenant: (tenantId: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  joinTenantByCode: (code: string) => Promise<void>;
  leaveTenant: (tenantId: string) => Promise<void>;
  regenerateJoinCode: (tenantId?: string) => Promise<string | null>;
  refreshCurrentTenant: () => Promise<void>;
  updateTenantBranding: (tenantId: string, settings: Tenant['data']['settings']) => Promise<void>;
  isTenantResourceAllowed: (resource: 'projects' | 'users' | 'storage') => boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

/** Generate a 6-char alphanumeric join code (no ambiguous chars like 0/O, 1/I/L) */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function TenantProvider({ children }: { children: React.ReactNode }) {
  const { authUser, isAdmin, teamUsers } = useAuthContext();
  const { showToast } = useUIContext();

  // State
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userMemberships, setUserMemberships] = useState<TenantMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const [isResolvingTenant, setIsResolvingTenant] = useState(true);

  // Super-admin = ADMIN_EMAILS users only
  const isSuperAdmin = authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false;

  // ===== EFFECT: Load user's tenant memberships from user doc =====
  useEffect(() => {
    if (!authUser) {
      setUserMemberships([]);
      setIsResolvingTenant(false);
      return;
    }

    setIsResolvingTenant(true);
    const fb = getFirebase();
    const unsub = fb.firestore()
      .collection('users')
      .doc(authUser.uid)
      .onSnapshot((snap: any) => {
        if (snap.exists) {
          const data = snap.data();
          let memberships: TenantMembership[] = (data.tenants as TenantMembership[] | undefined) || [];

          // Migration: if old `tenantId` string field exists, convert to `tenants` array
          if (!memberships.length && data.tenantId) {
            const migrated: TenantMembership[] = [{
              tenantId: data.tenantId as string,
              role: (data.role as string) || 'Miembro',
              joinedAt: data.createdAt || serverTimestamp(),
            }];
            // Write migrated format
            snap.ref.update({
              tenants: migrated,
              tenantId: (fb.firestore.FieldValue as any).delete(),
            }).catch((err: unknown) => console.warn('[Tenant] Migration failed:', err));
            memberships = migrated;
          }

          setUserMemberships(memberships);
        } else {
          setUserMemberships([]);
        }
        setIsResolvingTenant(false);
      }, (err: unknown) => {
        console.warn('[Tenant] User doc listener error:', err);
        setIsResolvingTenant(false);
      });

    return () => unsub();
  }, [authUser]);

  // ===== EFFECT: Auto-select tenant =====
  useEffect(() => {
    if (!authUser || userMemberships.length === 0 || currentTenantId) return;

    const selectFromMemberships = () => {
      // 1. Try domain detection first
      const domain = detectTenantFromDomain();
      if (domain) {
        fetchTenantByDomain(domain)
          .then(tenant => {
            if (tenant && userMemberships.some(m => m.tenantId === tenant.id)) {
              setCurrentTenantId(tenant.id);
              try { localStorage.setItem('archiflow-tenant-id', tenant.id); } catch { /* ignore */ }
              return;
            }
            // Domain found but user not a member — continue to other methods
            fallbackSelect();
          })
          .catch(() => fallbackSelect());
        return;
      }
      fallbackSelect();
    };

    const fallbackSelect = () => {
      // 2. Try localStorage
      try {
        const stored = localStorage.getItem('archiflow-tenant-id');
        if (stored && userMemberships.some(m => m.tenantId === stored)) {
          setCurrentTenantId(stored);
          return;
        }
      } catch { /* ignore */ }

      // 3. Auto-select if only one membership
      if (userMemberships.length === 1) {
        setCurrentTenantId(userMemberships[0].tenantId);
        try { localStorage.setItem('archiflow-tenant-id', userMemberships[0].tenantId); } catch { /* ignore */ }
      }
      // If multiple memberships and none matched → needsTenantSelection = true (user picks)
    };

    selectFromMemberships();
  }, [authUser, userMemberships, currentTenantId]);

  // ===== EFFECT: Load current tenant data when tenantId changes =====
  useEffect(() => {
    if (!authUser || !currentTenantId) {
      setCurrentTenant(null);
      return;
    }

    const fb = getFirebase();
    const unsub = fb.firestore()
      .collection('tenants')
      .doc(currentTenantId)
      .onSnapshot((snap: { exists: boolean; id: string; data: () => unknown }) => {
        if (snap.exists) {
          const tenant = { id: snap.id, data: snap.data() as Tenant['data'] };
          setCurrentTenant(tenant);
        } else {
          setCurrentTenant(null);
        }
      }, (err: unknown) => {
        console.warn('[Tenant] Snapshot listener error:', err);
      });

    return () => unsub();
  }, [authUser, currentTenantId]);

  // ===== Load all tenants (for super-admin) =====
  const loadTenants = useCallback(() => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      const fb = getFirebase();
      const unsub = fb.firestore()
        .collection('tenants')
        .orderBy('name', 'asc')
        .onSnapshot((snap: QuerySnapshot) => {
          const docs = snapToDocs<Tenant['data']>(snap).map(t => ({ id: t.id, data: t.data }));
          setTenants(docs);
          setIsLoading(false);
        }, (err: unknown) => {
          console.warn('[Tenant] Error loading tenants:', err);
          setIsLoading(false);
        });
      return () => unsub();
    } catch (err) {
      console.error('[Tenant] loadTenants failed:', err);
      setIsLoading(false);
    }
  }, [authUser]);

  // Auto-load tenants for admins
  useEffect(() => {
    if (isSuperAdmin) {
      const cleanup = loadTenants() as (() => void) | undefined;
      return () => { if (cleanup) cleanup(); };
    }
  }, [isSuperAdmin, loadTenants]);

  // ===== Filtered team users for current tenant =====
  const tenantTeamUsers = useMemo<TeamUser[]>(() => {
    if (!currentTenantId || !teamUsers.length) return [];
    return teamUsers.filter(u => {
      const data = u.data as Record<string, unknown>;
      // New format: tenants array
      const userTenants = data.tenants as TenantMembership[] | undefined;
      if (Array.isArray(userTenants) && userTenants.some(t => t.tenantId === currentTenantId)) return true;
      // Old format: tenantId field (migration compat)
      if (data.tenantId === currentTenantId) return true;
      // Super-admins see all users in current tenant context
      if (ADMIN_EMAILS.includes((data.email as string) || '')) return true;
      return false;
    });
  }, [currentTenantId, teamUsers]);

  // ===== needsTenantSelection: user logged in but no tenant selected =====
  const needsTenantSelection = useMemo(() => {
    return !!authUser && !isResolvingTenant && !currentTenantId;
  }, [authUser, isResolvingTenant, currentTenantId]);

  // ===== Select a tenant (user action) =====
  const selectTenant = useCallback(async (tenantId: string) => {
    if (!authUser) return;
    setSwitchingTenant(true);
    try {
      setCurrentTenantId(tenantId);
      try { localStorage.setItem('archiflow-tenant-id', tenantId); } catch { /* ignore */ }
    } catch (err) {
      console.error('[Tenant] Select failed:', err);
      showToast('Error al seleccionar organización', 'error');
    } finally {
      setSwitchingTenant(false);
    }
  }, [authUser, showToast]);

  // ===== Switch tenant (super-admin — can switch to any tenant) =====
  const switchTenant = useCallback(async (tenantId: string) => {
    if (!isSuperAdmin) {
      showToast('Solo super-admins pueden cambiar de organización', 'error');
      return;
    }
    await selectTenant(tenantId);
    showToast('Organización cambiada exitosamente');
  }, [isSuperAdmin, selectTenant, showToast]);

  // ===== Join tenant by code =====
  const joinTenantByCode = useCallback(async (code: string) => {
    if (!authUser) return;
    code = code.trim().toUpperCase();
    if (code.length !== 6) {
      showToast('El código debe tener 6 caracteres', 'error');
      return;
    }

    try {
      const fb = getFirebase();
      // Look up tenant by joinCode
      const snap = await fb.firestore()
        .collection('tenants')
        .where('joinCode', '==', code)
        .limit(1)
        .get();

      if (snap.empty) {
        showToast('Código no válido. Verifica e intenta de nuevo.', 'error');
        return;
      }

      const tenantId = snap.docs[0].id;

      // Check if user is already a member
      if (userMemberships.some(m => m.tenantId === tenantId)) {
        showToast('Ya eres miembro de esta organización', 'warning');
        return;
      }

      // Check tenant plan limits
      const tenantData = snap.docs[0].data();
      const limits = tenantData.limits as { maxUsers: number } | undefined;
      const stats = tenantData.stats as { userCount: number } | undefined;
      if (limits && stats && limits.maxUsers !== -1 && stats.userCount >= limits.maxUsers) {
        showToast('Esta organización alcanzó su límite de usuarios. Contacta al admin.', 'error');
        return;
      }

      // Add membership to user doc
      const newMembership: TenantMembership = {
        tenantId,
        role: 'Miembro',
        joinedAt: serverTimestamp(),
      };

      await fb.firestore()
        .collection('users')
        .doc(authUser.uid)
        .update({
          tenants: fb.firestore.FieldValue.arrayUnion(newMembership),
        });

      // Increment tenant user count
      await fb.firestore()
        .collection('tenants')
        .doc(tenantId)
        .update({
          'stats.userCount': fb.firestore.FieldValue.increment(1),
          updatedAt: serverTimestamp(),
        });

      showToast('Te has unido a la organización exitosamente');
      setCurrentTenantId(tenantId);
      try { localStorage.setItem('archiflow-tenant-id', tenantId); } catch { /* ignore */ }
    } catch (err) {
      console.error('[Tenant] Join by code failed:', err);
      showToast('Error al unirse a la organización', 'error');
    }
  }, [authUser, userMemberships, showToast]);

  // ===== Leave tenant =====
  const leaveTenant = useCallback(async (tenantId: string) => {
    if (!authUser) return;

    // Don't allow leaving if it's the only tenant
    if (userMemberships.length <= 1) {
      showToast('Debes pertenecer al menos a una organización', 'error');
      return;
    }

    try {
      const fb = getFirebase();

      // Remove membership from user doc
      const membership = userMemberships.find(m => m.tenantId === tenantId);
      if (membership) {
        await fb.firestore()
          .collection('users')
          .doc(authUser.uid)
          .update({
            tenants: fb.firestore.FieldValue.arrayRemove(membership),
          });
      }

      // Decrement tenant user count
      await fb.firestore()
        .collection('tenants')
        .doc(tenantId)
        .update({
          'stats.userCount': fb.firestore.FieldValue.increment(-1),
          updatedAt: serverTimestamp(),
        });

      // If leaving the current tenant, switch to another
      if (currentTenantId === tenantId) {
        const remaining = userMemberships.filter(m => m.tenantId !== tenantId);
        if (remaining.length > 0) {
          const nextId = remaining[0].tenantId;
          setCurrentTenantId(nextId);
          try { localStorage.setItem('archiflow-tenant-id', nextId); } catch { /* ignore */ }
        } else {
          setCurrentTenantId(null);
          try { localStorage.removeItem('archiflow-tenant-id'); } catch { /* ignore */ }
        }
      }

      showToast('Has salido de la organización');
    } catch (err) {
      console.error('[Tenant] Leave failed:', err);
      showToast('Error al salir de la organización', 'error');
    }
  }, [authUser, userMemberships, currentTenantId, showToast]);

  // ===== Regenerate join code =====
  const regenerateJoinCode = useCallback(async (tenantId?: string) => {
    const targetId = tenantId || currentTenantId;
    if (!targetId) return null;

    try {
      const code = generateJoinCode();
      await getFirebase().firestore()
        .collection('tenants')
        .doc(targetId)
        .update({ joinCode: code, updatedAt: serverTimestamp() });

      showToast('Código de acceso regenerado');
      return code;
    } catch (err) {
      console.error('[Tenant] Regenerate code failed:', err);
      showToast('Error al generar código', 'error');
      return null;
    }
  }, [currentTenantId, showToast]);

  // ===== Refresh current tenant =====
  const refreshCurrentTenant = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      const fb = getFirebase();
      const snap = await fb.firestore().collection('tenants').doc(currentTenantId).get();
      if (snap.exists) {
        setCurrentTenant({ id: snap.id, data: snap.data() as Tenant['data'] });
      }
    } catch (err) {
      console.error('[Tenant] Refresh failed:', err);
    }
  }, [currentTenantId]);

  // ===== Update tenant branding =====
  const updateTenantBranding = useCallback(async (
    tenantId: string,
    settings: Tenant['data']['settings'],
  ) => {
    try {
      await getFirebase().firestore()
        .collection('tenants')
        .doc(tenantId)
        .update({ settings, updatedAt: serverTimestamp() });
      showToast('Branding actualizado');
    } catch (err) {
      console.error('[Tenant] Branding update failed:', err);
      showToast('Error al actualizar branding', 'error');
    }
  }, [showToast]);

  // ===== Check plan limits =====
  const isTenantResourceAllowed = useCallback((resource: 'projects' | 'users' | 'storage'): boolean => {
    if (!currentTenant) return true;
    const { limits, stats } = currentTenant.data;
    if (limits.maxProjects === -1) return true; // unlimited (enterprise)
    const currentMap = { projects: stats.projectCount, users: stats.userCount, storage: stats.storageUsed };
    const maxMap = { projects: limits.maxProjects, users: limits.maxUsers, storage: limits.maxStorage };
    return (currentMap[resource] || 0) < (maxMap[resource] || 0);
  }, [currentTenant]);

  // ===== PROVIDER VALUE =====
  const value: TenantContextType = useMemo(() => ({
    currentTenantId,
    setCurrentTenantId,
    tenants,
    currentTenant,
    userMemberships,
    tenantTeamUsers,
    isLoading,
    isSuperAdmin,
    switchingTenant,
    needsTenantSelection,
    isResolvingTenant,
    loadTenants,
    selectTenant,
    switchTenant,
    joinTenantByCode,
    leaveTenant,
    regenerateJoinCode,
    refreshCurrentTenant,
    updateTenantBranding,
    isTenantResourceAllowed,
  }), [
    currentTenantId, tenants, currentTenant, userMemberships, tenantTeamUsers,
    isLoading, isSuperAdmin, switchingTenant, needsTenantSelection, isResolvingTenant,
    loadTenants, selectTenant, switchTenant, joinTenantByCode, leaveTenant, regenerateJoinCode,
    refreshCurrentTenant, updateTenantBranding, isTenantResourceAllowed,
  ]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider');
  return ctx;
}
