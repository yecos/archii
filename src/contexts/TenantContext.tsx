'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from './AuthContext';
import { useUIContext } from './UIContext';
import { getFirebase, serverTimestamp, snapToDocs, type QuerySnapshot } from '@/lib/firebase-service';
import { detectTenantFromDomain, fetchTenantByDomain } from '@/lib/tenant-service';
import type { Tenant, TenantPlan } from '@/lib/types';
import { ADMIN_EMAILS } from '@/lib/types';

/* ===== TENANT CONTEXT ===== */
interface TenantContextType {
  // State
  currentTenantId: string | null;
  setCurrentTenantId: React.Dispatch<React.SetStateAction<string | null>>;
  tenants: Tenant[];
  currentTenant: Tenant | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  switchingTenant: boolean;

  // Actions
  loadTenants: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshCurrentTenant: () => Promise<void>;
  updateTenantBranding: (tenantId: string, settings: Tenant['data']['settings']) => Promise<void>;
  isTenantResourceAllowed: (resource: 'projects' | 'users' | 'storage') => boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export default function TenantProvider({ children }: { children: React.ReactNode }) {
  const { authUser, isAdmin, teamUsers } = useAuthContext();
  const { showToast } = useUIContext();

  // State
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState(false);

  // Super-admin = ADMIN_EMAILS users only
  const isSuperAdmin = authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false;

  // ===== EFFECT: Auto-detect tenant from domain on mount =====
  useEffect(() => {
    if (!authUser) return;

    // Try to detect tenant from domain first
    const domain = detectTenantFromDomain();
    if (domain) {
      fetchTenantByDomain(domain)
        .then(tenant => {
          if (tenant) {
            setCurrentTenantId(tenant.id);
            setCurrentTenant(tenant);
          }
        })
        .catch(err => {
          console.warn('[Tenant] Domain detection failed:', err);
        });
    }

    // Fallback: check if user already has a tenantId stored
    if (!currentTenantId) {
      try {
        const storedTenantId = localStorage.getItem('archiflow-tenant-id');
        if (storedTenantId) {
          setCurrentTenantId(storedTenantId);
        }
      } catch { /* ignore */ }
    }
  }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== EFFECT: Load current tenant data when tenantId changes =====
  useEffect(() => {
    if (!authUser || !currentTenantId) return;

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

  // ===== Load all tenants (for super-admin switching) =====
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

  // ===== Switch active tenant =====
  const switchTenant = useCallback(async (tenantId: string) => {
    if (!isSuperAdmin) {
      showToast('Solo super-admins pueden cambiar de tenant', 'error');
      return;
    }
    setSwitchingTenant(true);
    try {
      // Update user profile with selected tenant
      await getFirebase().firestore()
        .collection('users')
        .doc(authUser!.uid)
        .update({ tenantId });
      setCurrentTenantId(tenantId);
      try { localStorage.setItem('archiflow-tenant-id', tenantId); } catch { /* ignore */ }
      showToast('Tenant cambiado exitosamente');
    } catch (err) {
      console.error('[Tenant] Switch failed:', err);
      showToast('Error al cambiar de tenant', 'error');
    } finally {
      setSwitchingTenant(false);
    }
  }, [isSuperAdmin, authUser, showToast]);

  // ===== Refresh current tenant from Firestore =====
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

  // ===== Update tenant branding settings =====
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

  // ===== Check if tenant allows creating more of a resource =====
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
    isLoading,
    isSuperAdmin,
    switchingTenant,
    loadTenants,
    switchTenant,
    refreshCurrentTenant,
    updateTenantBranding,
    isTenantResourceAllowed,
  }), [
    currentTenantId, tenants, currentTenant, isLoading, isSuperAdmin, switchingTenant,
    loadTenants, switchTenant, refreshCurrentTenant, updateTenantBranding, isTenantResourceAllowed,
  ]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider');
  return ctx;
}
