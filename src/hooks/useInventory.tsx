'use client';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNotificationsContext } from '@/hooks/useNotifications';
import type { InvProduct, InvCategory, InvMovement, InvTransfer } from '@/lib/types';
import { INV_WAREHOUSES, CAT_COLORS } from '@/lib/types';
import { fileToBase64 } from '@/lib/helpers';
import { getFirebase } from '@/lib/firebase-service';
import { inventoryRequest } from '@/lib/inventory-client';
import { inventoryStock, inventoryTotal } from '@/lib/inventory-stock';

/* ===== TYPES ===== */
export interface InventoryContextValue {
  // State
  invProducts: InvProduct[];
  invCategories: InvCategory[];
  invMovements: InvMovement[];
  invTransfers: InvTransfer[];
  invTab: 'dashboard' | 'products' | 'categories' | 'warehouse' | 'movements' | 'transfers' | 'reports';
  setInvTab: React.Dispatch<React.SetStateAction<'dashboard' | 'products' | 'categories' | 'warehouse' | 'movements' | 'transfers' | 'reports'>>;
  invFilterCat: string;
  setInvFilterCat: React.Dispatch<React.SetStateAction<string>>;
  invSearch: string;
  setInvSearch: React.Dispatch<React.SetStateAction<string>>;
  invMovFilterType: string;
  setInvMovFilterType: React.Dispatch<React.SetStateAction<string>>;
  invTransferFilterStatus: string;
  setInvTransferFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  invWarehouseFilter: string;
  setInvWarehouseFilter: React.Dispatch<React.SetStateAction<string>>;

  // Functions
  getWarehouseStock: (product: InvProduct, warehouse?: string) => number;
  getTotalStock: (product: InvProduct) => number;
  buildWarehouseStock: (product: InvProduct) => Record<string, number>;
  saveInvProduct: () => Promise<void>;
  deleteInvProduct: (id: string) => Promise<void>;
  openEditInvProduct: (p: InvProduct) => void;
  saveInvCategory: () => Promise<void>;
  deleteInvCategory: (id: string) => Promise<void>;
  openEditInvCategory: (c: InvCategory) => void;
  saveInvMovement: () => Promise<void>;
  deleteInvMovement: (id: string) => Promise<void>;
  saveInvTransfer: () => Promise<void>;
  deleteInvTransfer: (id: string) => Promise<void>;
  getInvCategoryName: (catId: string) => string;
  getInvCategoryColor: (catId: string) => string;
  getInvProductName: (prodId: string) => string;
  handleInvProductImageSelect: (e: any) => void;

  invSaving: boolean;
  invLoading: boolean;
  invLoadError: string;
  retryInventory: () => void;

  // Derived values
  invTotalValue: number;
  invLowStock: InvProduct[];
  invTotalStock: number;
  invPendingTransfers: number;
  invAlerts: Array<{ type: string; msg: string; severity: string }>;
}

const InventoryContext = createContext<InventoryContextValue>(null!);

/* ===== HELPERS ===== */
// scrubUndefined imported from @/lib/helpers (canonical version)


/* ===== PROVIDER ===== */
export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { authUser, activeTenantId, ready, forms, setForms, editingId, setEditingId, showToast, openModal, closeModal } = useApp();
  const { sendNotif, notifPrefs } = useNotificationsContext();

  // ===== INVENTORY STATE =====
  const [invProducts, setInvProducts] = useState<InvProduct[]>([]);
  const [invCategories, setInvCategories] = useState<InvCategory[]>([]);
  const [invMovements, setInvMovements] = useState<InvMovement[]>([]);
  const [invTransfers, setInvTransfers] = useState<InvTransfer[]>([]);
  const [invTab, setInvTab] = useState<'dashboard' | 'products' | 'categories' | 'warehouse' | 'movements' | 'transfers' | 'reports'>('dashboard');
  const [invFilterCat, setInvFilterCat] = useState<string>('all');
  const [invSearch, setInvSearch] = useState('');
  const [invMovFilterType, setInvMovFilterType] = useState<string>('all');
  const [invTransferFilterStatus, setInvTransferFilterStatus] = useState<string>('all');
  const [invWarehouseFilter, setInvWarehouseFilter] = useState<string>('all');

  const [invSaving, setInvSaving] = useState(false);
  const savingRef = useRef(false);
  const [loadedScope, setLoadedScope] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [invLoadError, setInvLoadError] = useState('');
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);
  const retryInventory = () => setSubscriptionVersion(v => v + 1);
  const [allProducts, setAllProducts] = useState<InvProduct[]>([]);
  const [allCategories, setAllCategories] = useState<InvCategory[]>([]);

  // ===== INTERNAL REFS (notification detection) =====
  const knownMovementIdsRef = useRef<Set<string>>(new Set());
  const knownTransferIdsRef = useRef<Set<string>>(new Set());
  const prevTransferStatusRef = useRef<Map<string, string>>(new Map());
  const firstInvLoadRef = useRef(false);

  // ===== FIRESTORE LISTENERS =====

  useEffect(() => {
    setInvProducts([]); setInvCategories([]); setInvMovements([]); setInvTransfers([]);
    setAllProducts([]); setAllCategories([]); setLoaded(false); setInvLoadError('');
    setLoadedScope(`${authUser?.uid || ''}:${activeTenantId || ''}`);
    firstInvLoadRef.current = false;
    knownMovementIdsRef.current = new Set(); knownTransferIdsRef.current = new Set();
    prevTransferStatusRef.current = new Map();
    if (!ready || !authUser || !activeTenantId) return;
    const db = getFirebase().firestore();
    const received = new Set<string>();
    let cancelled = false;
    const subscriptions = [
      ['invProducts', 'createdAt', 'desc', (docs: InvProduct[]) => { setAllProducts(docs); setInvProducts(docs.filter(d => !d.data.archived)); }],
      ['invCategories', 'name', 'asc', (docs: InvCategory[]) => { setAllCategories(docs); setInvCategories(docs.filter(d => !d.data.archived)); }],
      ['invMovements', 'createdAt', 'desc', setInvMovements],
      ['invTransfers', 'createdAt', 'desc', setInvTransfers],
    ] as const;
    const unsubs = subscriptions.map(([collection, sort, direction, setDocs]) =>
      (collection === 'invMovements' || collection === 'invTransfers'
        ? db.collection(collection).where('tenantId', '==', activeTenantId).orderBy(sort, direction).limit(100)
        : db.collection(collection).where('tenantId', '==', activeTenantId).orderBy(sort, direction)).onSnapshot(snap => {
        if (cancelled) return;
        const docs = snap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
        if (!received.has(collection)) {
          if (collection === 'invMovements') knownMovementIdsRef.current = new Set(docs.map(d => d.id));
          if (collection === 'invTransfers') {
            knownTransferIdsRef.current = new Set(docs.map(d => d.id));
            prevTransferStatusRef.current = new Map(docs.map(d => [d.id, d.data.status]));
          }
        }
        setDocs(docs);
        received.add(collection);
        if (received.size === subscriptions.length) setLoaded(true);
      }, (error: unknown) => {
        if (cancelled) return;
        console.error('[Archii] inventory subscription:', error);
        setInvLoadError('No se pudo cargar todo el inventario. Verifica tu conexión y vuelve a intentar.');
        setLoaded(true);
      }),
    );
    return () => { cancelled = true; unsubs.forEach(unsub => unsub()); };
  }, [ready, authUser, activeTenantId, subscriptionVersion]);

  // ===== NOTIFICATION: Mark inventory as loaded =====
  useEffect(() => {
    if (invProducts.length > 0 || invMovements.length > 0 || invTransfers.length > 0) {
      firstInvLoadRef.current = true;
    }
  }, [invProducts, invMovements, invTransfers]);

  // ===== NOTIFICATION: Detect low stock and inventory alerts (Set-based O(1) lookup) =====
  useEffect(() => {
    if (!firstInvLoadRef.current) return;
    if (!notifPrefs.inventory) return;
    const newMovIds: string[] = [];
    const newTransIds: string[] = [];
    const changedTransIds: string[] = [];
    invMovements.forEach(m => { if (!knownMovementIdsRef.current.has(m.id)) newMovIds.push(m.id); });
    invTransfers.forEach(t => {
      if (!knownTransferIdsRef.current.has(t.id)) newTransIds.push(t.id);
      else {
        const prev = prevTransferStatusRef.current.get(t.id);
        if (prev && prev !== t.data.status) changedTransIds.push(t.id);
      }
    });
    knownMovementIdsRef.current = new Set(invMovements.map(m => m.id));
    knownTransferIdsRef.current = new Set(invTransfers.map(t => t.id));
    invTransfers.forEach(t => { prevTransferStatusRef.current.set(t.id, t.data.status); });

    newMovIds.forEach(id => {
      const m = invMovements.find(mm => mm.id === id);
      if (!m) return;
      const prod = invProducts.find(p => p.id === m.data.productId);
      sendNotif(m.data.type === 'Entrada' ? '📥 Entrada de inventario' : '📤 Salida de inventario', `${prod?.data?.name || 'Producto'} · ${m.data.quantity} ${prod?.data?.unit || 'uds'}${m.data.reason ? ` — ${m.data.reason}` : ''}`, undefined, `mov-${m.id}`, { type: 'inventory', screen: 'inventory' });
    });
    newTransIds.forEach(id => {
      const t = invTransfers.find(tt => tt.id === id);
      if (!t) return;
      sendNotif('🚚 Nueva transferencia', `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse} (${t.data.quantity})`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory' });
    });
    changedTransIds.forEach(id => {
      const t = invTransfers.find(tt => tt.id === id);
      if (!t) return;
      const statusEmoji = t.data.status === 'Completada' ? '✅' : t.data.status === 'En tránsito' ? '🚛' : t.data.status === 'Cancelada' ? '❌' : '📦';
      sendNotif(`${statusEmoji} Transferencia ${t.data.status.toLowerCase()}`, `${t.data.productName || 'Producto'}: ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, undefined, `transfer-${t.id}`, { type: 'inventory', screen: 'inventory' });
    });
  }, [invMovements, invTransfers, invProducts, notifPrefs.inventory, sendNotif]);

  // ===== NOTIFICATION: Low stock periodic check (every 10 min) =====
  useEffect(() => {
    if (!firstInvLoadRef.current) return;
    if (!notifPrefs.inventory) return;
    let lastLowStockCount = -1;
    const check = () => {
      const lowStock = invProducts.filter(p => { const stock = inventoryTotal(p.data); return stock > 0 && stock <= (p.data.minStock ?? 5); });
      const outOfStock = invProducts.filter(p => { const stock = inventoryTotal(p.data); return stock <= 0; });
      const total = lowStock.length + outOfStock.length;
      if (total > 0 && total !== lastLowStockCount) {
        lastLowStockCount = total;
        sendNotif(outOfStock.length > 0 ? '🚨 Alerta de inventario' : '⚠️ Stock bajo', outOfStock.length > 0 ? `${outOfStock.length} sin stock${lowStock.length > 0 ? `, ${lowStock.length} bajo mínimo` : ''}: ${outOfStock.map(p => p.data.name).slice(0,3).join(', ')}` : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} bajo mínimo: ${lowStock.map(p => p.data.name).slice(0,3).join(', ')}`, undefined, 'inv-lowstock-check', { type: 'inventory', screen: 'inventory' });
      }
    };
    const initTimer = setTimeout(check, 10000);
    const iv = setInterval(check, 10 * 60 * 1000);
    return () => { clearTimeout(initTimer); clearInterval(iv); };
  }, [invProducts, notifPrefs.inventory, sendNotif]);

  // ===== INVENTORY FUNCTIONS =====
  const getWarehouseStock = (product: InvProduct, warehouse?: string) => inventoryStock(product.data)[warehouse || ''] || 0;
  const getTotalStock = (product: InvProduct) => inventoryTotal(product.data);
  const buildWarehouseStock = (product: InvProduct) => inventoryStock(product.data);

  const run = async (action: Parameters<typeof inventoryRequest>[1], data: Record<string, unknown>, message: string, modal?: string) => {
    if (savingRef.current) return;
    savingRef.current = true; setInvSaving(true);
    try {
      await inventoryRequest(activeTenantId, action, data);
      showToast(message);
      if (modal) { closeModal(modal); setEditingId(null); }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo confirmar la operación', 'error');
    } finally { savingRef.current = false; setInvSaving(false); }
  };

  const saveInvProduct = async () => {
    const warehouseStock: Record<string, number> = {};
    INV_WAREHOUSES.forEach(w => { warehouseStock[w] = Number(forms[`invProdWS_${w.replace(/\s/g, '_')}`] || 0); });
    await run('saveProduct', {
      ...(editingId ? { id: editingId } : { warehouseStock }),
      name: forms.invProdName || '', sku: forms.invProdSku || '', categoryId: forms.invProdCat || '',
      unit: forms.invProdUnit || 'Unidad', price: Number(forms.invProdPrice || 0), minStock: Number(forms.invProdMinStock || 0),
      description: forms.invProdDesc || '', imageData: forms.invProdImage || '', warehouse: forms.invProdWarehouse || 'Almacén Principal',
    }, editingId ? 'Producto actualizado' : 'Producto creado', 'invProduct');
  };
  const deleteInvProduct = async (id: string) => run('archiveProduct', { id }, 'Producto archivado');
  const openEditInvProduct = (p: InvProduct) => {
    setEditingId(p.id);
    const ws = buildWarehouseStock(p);
    const f: Record<string, any> = { invProdName: p.data.name, invProdSku: p.data.sku || '', invProdCat: p.data.categoryId || '', invProdUnit: p.data.unit || 'Unidad', invProdPrice: String(p.data.price ?? ''), invProdMinStock: String(p.data.minStock ?? 5), invProdDesc: p.data.description || '', invProdImage: p.data.imageData || '', invProdWarehouse: p.data.warehouse || 'Almacén Principal' };
    INV_WAREHOUSES.forEach(w => { f[`invProdWS_${w.replace(/\s/g, '_')}`] = String(ws[w] || 0); });
    setForms(prev => ({ ...prev, ...f })); openModal('invProduct');
  };
  const saveInvCategory = async () => run('saveCategory', {
    ...(editingId ? { id: editingId } : {}), name: forms.invCatName || '',
    color: forms.invCatColor || CAT_COLORS[invCategories.length % CAT_COLORS.length], description: forms.invCatDesc || '',
  }, editingId ? 'Categoría actualizada' : 'Categoría creada', 'invCategory');
  const deleteInvCategory = async (id: string) => run('archiveCategory', { id }, 'Categoría archivada');
  const openEditInvCategory = (c: InvCategory) => { setEditingId(c.id); setForms(f => ({ ...f, invCatName: c.data.name, invCatColor: c.data.color || '', invCatDesc: c.data.description || '' })); openModal('invCategory'); };
  const saveInvMovement = async () => run('movement', {
    productId: forms.invMovProduct || '', type: forms.invMovType || 'Entrada', quantity: Number(forms.invMovQty || 0),
    warehouse: forms.invMovWarehouse || 'Almacén Principal', reason: forms.invMovReason || '', reference: forms.invMovRef || '', date: forms.invMovDate || '',
  }, 'Movimiento registrado', 'invMovement');
  const deleteInvMovement = async (id: string) => run('reverseMovement', { id }, 'Movimiento anulado con registro de compensación');
  const saveInvTransfer = async () => run('transfer', {
    productId: forms.invTrProduct || '', quantity: Number(forms.invTrQty || 0), fromWarehouse: forms.invTrFrom || '',
    toWarehouse: forms.invTrTo || '', notes: forms.invTrNotes || '', date: forms.invTrDate || '',
  }, 'Transferencia completada', 'invTransfer');
  const deleteInvTransfer = async (id: string) => run('reverseTransfer', { id }, 'Transferencia anulada con registro de compensación');
  const getInvCategoryName = (id: string) => allCategories.find(c => c.id === id)?.data.name || 'Sin categoría';
  const getInvCategoryColor = (id: string) => allCategories.find(c => c.id === id)?.data.color || '#6b7280';
  const getInvProductName = (id: string) => allProducts.find(p => p.id === id)?.data.name || 'Desconocido';

  const handleInvProductImageSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; }
    if (file.size > 400 * 1024) { showToast('Máx 400 KB', 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      setForms(p => ({ ...p, invProdImage: base64 }));
    } catch { showToast('Error al procesar', 'error'); }
  };

  // ===== DERIVED VALUES =====
  const invTotalValue = invProducts.reduce((s, p) => s + (Number(p.data.price) || 0) * getTotalStock(p), 0);
  const invLowStock = invProducts.filter(p => getTotalStock(p) > 0 && getTotalStock(p) <= (Number(p.data.minStock) || 0));
  const invTotalStock = invProducts.reduce((s, p) => s + getTotalStock(p), 0);
  const invPendingTransfers = invTransfers.filter(t => t.data.status === 'Pendiente' || t.data.status === 'En tránsito').length;
  const invAlerts = [
    ...(invLowStock.map(p => ({ type: 'low_stock' as const, msg: `${p.data.name}: stock ${getTotalStock(p)} (mín: ${p.data.minStock})`, severity: 'high' as const }))),
    ...(invTransfers.filter(t => t.data.status === 'Pendiente').map(t => ({ type: 'pending_transfer' as const, msg: `Transferencia pendiente: ${t.data.quantity} uds de ${t.data.fromWarehouse} → ${t.data.toWarehouse}`, severity: 'medium' as const }))),
    ...(invProducts.filter(p => getTotalStock(p) === 0).map(p => ({ type: 'out_of_stock' as const, msg: `${p.data.name}: AGOTADO`, severity: 'critical' as const }))),
  ];

  // ===== CONTEXT VALUE =====
  const value: InventoryContextValue = {
    invProducts, invCategories, invMovements, invTransfers,
    invSaving, invLoading: !loaded || loadedScope !== `${authUser?.uid || ''}:${activeTenantId || ''}`, invLoadError, retryInventory,
    invTab, setInvTab, invFilterCat, setInvFilterCat, invSearch, setInvSearch,
    invMovFilterType, setInvMovFilterType, invTransferFilterStatus, setInvTransferFilterStatus,
    invWarehouseFilter, setInvWarehouseFilter,
    getWarehouseStock, getTotalStock, buildWarehouseStock,
    saveInvProduct, deleteInvProduct, openEditInvProduct,
    saveInvCategory, deleteInvCategory, openEditInvCategory,
    saveInvMovement, deleteInvMovement,
    saveInvTransfer, deleteInvTransfer,
    getInvCategoryName, getInvCategoryColor, getInvProductName,
    handleInvProductImageSelect,
    invTotalValue, invLowStock, invTotalStock, invPendingTransfers, invAlerts,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

/* ===== HOOK ===== */
export function useInventoryContext() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventoryContext must be used within an InventoryProvider');
  return ctx;
}
