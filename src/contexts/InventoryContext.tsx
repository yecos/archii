'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot, type Transaction } from '@/lib/firebase-service';
import { INV_WAREHOUSES, CAT_COLORS } from '@/lib/types';
import type { InvProduct, InvCategory, InvMovement, InvTransfer } from '@/lib/types';
import { confirm } from '@/hooks/useConfirmDialog';
import { useTenantId } from '@/hooks/useTenantId';

/* ===== INVENTORY CONTEXT ===== */
interface InventoryContextType {
  // Collection state
  invProducts: InvProduct[];
  setInvProducts: React.Dispatch<React.SetStateAction<InvProduct[]>>;
  invCategories: InvCategory[];
  setInvCategories: React.Dispatch<React.SetStateAction<InvCategory[]>>;
  invMovements: InvMovement[];
  setInvMovements: React.Dispatch<React.SetStateAction<InvMovement[]>>;
  invTransfers: InvTransfer[];
  setInvTransfers: React.Dispatch<React.SetStateAction<InvTransfer[]>>;

  // Domain UI state
  invTab: string; setInvTab: React.Dispatch<React.SetStateAction<string>>;
  invFilterCat: string; setInvFilterCat: React.Dispatch<React.SetStateAction<string>>;
  invSearch: string; setInvSearch: React.Dispatch<React.SetStateAction<string>>;
  invMovFilterType: string; setInvMovFilterType: React.Dispatch<React.SetStateAction<string>>;
  invTransferFilterStatus: string; setInvTransferFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  invWarehouseFilter: string; setInvWarehouseFilter: React.Dispatch<React.SetStateAction<string>>;

  // Helpers
  getWarehouseStock: (product: InvProduct, warehouse: string) => number;
  getTotalStock: (product: InvProduct) => number;
  buildWarehouseStock: (product: InvProduct) => Record<string, number>;

  // CRUD Functions
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

  // Lookups
  getInvCategoryName: (catId: string) => string;
  getInvCategoryColor: (catId: string) => string;
  getInvProductName: (prodId: string) => string;

  // Image handler
  handleInvProductImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  // Computed values
  invTotalValue: number;
  invLowStock: InvProduct[];
  invTotalStock: number;
  invPendingTransfers: number;
  invAlerts: Array<{ type: 'low_stock' | 'out_of_stock' | 'pending_transfer'; msg: string; severity: 'high' | 'medium' | 'critical' }>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export default function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms, openModal, closeModal, editingId, setEditingId } = useUIContext();
  const { ready, authUser } = useAuthContext();
  const tenantId = useTenantId();

  // ===== COLLECTION STATE =====
  const [invProducts, setInvProducts] = useState<InvProduct[]>([]);
  const [invCategories, setInvCategories] = useState<InvCategory[]>([]);
  const [invMovements, setInvMovements] = useState<InvMovement[]>([]);
  const [invTransfers, setInvTransfers] = useState<InvTransfer[]>([]);

  // ===== DOMAIN UI STATE =====
  const [invTab, setInvTab] = useState<string>('dashboard');
  const [invFilterCat, setInvFilterCat] = useState<string>('all');
  const [invSearch, setInvSearch] = useState<string>('');
  const [invMovFilterType, setInvMovFilterType] = useState<string>('all');
  const [invTransferFilterStatus, setInvTransferFilterStatus] = useState<string>('all');
  const [invWarehouseFilter, setInvWarehouseFilter] = useState<string>('all');

  // ===== EFFECTS =====

  // Load inventory products
  useEffect(() => {
    if (!ready || !authUser || !tenantId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invProducts').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').onSnapshot((snap: QuerySnapshot) => {
      setInvProducts(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando invProducts:', err); });
    return () => unsub();
  }, [ready, authUser, tenantId]);

  // Load inventory categories
  useEffect(() => {
    if (!ready || !authUser || !tenantId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invCategories').where('tenantId', '==', tenantId).orderBy('name', 'asc').onSnapshot((snap: QuerySnapshot) => {
      setInvCategories(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando invCategories:', err); });
    return () => unsub();
  }, [ready, authUser, tenantId]);

  // Load inventory movements
  useEffect(() => {
    if (!ready || !authUser || !tenantId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invMovements').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: QuerySnapshot) => {
      setInvMovements(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando invMovements:', err); });
    return () => unsub();
  }, [ready, authUser, tenantId]);

  // Load inventory transfers
  useEffect(() => {
    if (!ready || !authUser || !tenantId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invTransfers').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: QuerySnapshot) => {
      setInvTransfers(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando invTransfers:', err); });
    return () => unsub();
  }, [ready, authUser, tenantId]);

  // ===== HELPER FUNCTIONS =====

  const getWarehouseStock = (product: InvProduct, warehouse: string) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') return Number(product.data.warehouseStock[warehouse]) || 0;
    return product.data.warehouse === warehouse ? (Number(product.data.stock) || 0) : 0;
  };

  const getTotalStock = (product: InvProduct) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') return Object.values(product.data.warehouseStock).reduce((s: number, v: number) => s + (Number(v) || 0), 0);
    return Number(product.data.stock) || 0;
  };

  const buildWarehouseStock = (product: InvProduct) => {
    if (product.data.warehouseStock && typeof product.data.warehouseStock === 'object') {
      const ws = { ...product.data.warehouseStock };
      INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
      return ws;
    }
    const ws: Record<string, number> = {};
    INV_WAREHOUSES.forEach(w => { ws[w] = w === (product.data.warehouse || 'Almacén Principal') ? (Number(product.data.stock) || 0) : 0; });
    return ws;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ===== CRUD FUNCTIONS =====

  // --- Products ---
  const saveInvProduct = async () => {
    const name = forms.invProdName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const warehouseStock: Record<string, number> = {};
      INV_WAREHOUSES.forEach(w => { warehouseStock[w] = Number(forms[`invProdWS_${w.replace(/\s/g, '_')}`]) || 0; });
      const totalStock = Object.values(warehouseStock).reduce((s: number, v: number) => s + (Number(v) || 0), 0);
      const data = { name, sku: forms.invProdSku || '', categoryId: forms.invProdCat || '', unit: forms.invProdUnit || 'Unidad', price: Number(forms.invProdPrice) || 0, stock: totalStock, minStock: Number(forms.invProdMinStock) || 0, description: forms.invProdDesc || '', imageData: forms.invProdImage || '', warehouse: forms.invProdWarehouse || 'Almacén Principal', warehouseStock, updatedAt: ts, updatedBy: authUser?.uid };
      if (editingId) { await db.collection('invProducts').doc(editingId).update(data); showToast('Producto actualizado'); }
      else { await db.collection('invProducts').add({ ...data, createdAt: ts, createdBy: authUser?.uid, tenantId }); showToast('Producto creado'); }
      closeModal('invProduct'); setEditingId(null);
      const resetForms: Record<string, string> = { invProdName: '', invProdSku: '', invProdCat: '', invProdUnit: 'Unidad', invProdPrice: '', invProdMinStock: '5', invProdDesc: '', invProdImage: '', invProdWarehouse: 'Almacén Principal' };
      INV_WAREHOUSES.forEach(w => { resetForms[`invProdWS_${w.replace(/\s/g, '_')}`] = '0'; });
      setForms(p => ({ ...p, ...resetForms }));
    } catch (err) { console.error('[ArchiFlow] Inventory: save product failed:', err); showToast('Error al guardar', 'error'); }
  };

  const deleteInvProduct = async (id: string) => { if (!(await confirm({ title: 'Eliminar producto', description: '¿Eliminar este producto del inventario?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('invProducts').doc(id).delete(); showToast('Producto eliminado'); } catch (err) { console.error("[ArchiFlow]", err); } };

  const openEditInvProduct = (p: InvProduct) => {
    setEditingId(p.id);
    const ws = buildWarehouseStock(p);
    const f: Record<string, string> = { invProdName: p.data.name, invProdSku: p.data.sku || '', invProdCat: p.data.categoryId || '', invProdUnit: p.data.unit || 'Unidad', invProdPrice: String(p.data.price || ''), invProdMinStock: String(p.data.minStock || '5'), invProdDesc: p.data.description || '', invProdImage: p.data.imageData || '', invProdWarehouse: p.data.warehouse || 'Almacén Principal' };
    INV_WAREHOUSES.forEach(w => { f[`invProdWS_${w.replace(/\s/g, '_')}`] = String(ws[w] || 0); });
    setForms(prev => ({ ...prev, ...f }));
    openModal('invProduct');
  };

  // --- Categories ---
  const saveInvCategory = async () => {
    const name = forms.invCatName || '';
    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const color = forms.invCatColor || CAT_COLORS[invCategories.length % CAT_COLORS.length];
      const description = forms.invCatDesc || '';
      if (editingId) {
        await db.collection('invCategories').doc(editingId).update({ name, color, description, updatedAt: ts });
        showToast('Categoría actualizada');
      } else {
        await db.collection('invCategories').add({ name, color, description, createdAt: ts, tenantId });
        showToast('Categoría creada');
      }
      closeModal('invCategory'); setEditingId(null); setForms(p => ({ ...p, invCatName: '', invCatColor: '', invCatDesc: '' }));
    } catch (err) { console.error('[ArchiFlow] Inventory: save category failed:', err); showToast('Error al guardar', 'error'); }
  };

  const deleteInvCategory = async (id: string) => { if (!(await confirm({ title: 'Eliminar categoría', description: '¿Eliminar categoría?', confirmText: 'Eliminar', variant: 'destructive' }))) return; try { await getFirebase().firestore().collection('invCategories').doc(id).delete(); showToast('Categoría eliminada'); } catch (err) { console.error("[ArchiFlow]", err); } };
  const openEditInvCategory = (c: InvCategory) => { setEditingId(c.id); setForms(f => ({ ...f, invCatName: c.data.name, invCatColor: c.data.color || '', invCatDesc: c.data.description || '' })); openModal('invCategory'); };

  // --- Movements (with runTransaction for atomicity) ---
  const saveInvMovement = async () => {
    const productId = forms.invMovProduct || '';
    const qty = Number(forms.invMovQty) || 0;
    const warehouse = forms.invMovWarehouse || 'Almacén Principal';
    if (!productId || qty <= 0) { showToast('Selecciona producto, almacén y cantidad', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const type = forms.invMovType || 'Entrada';
      const movementData = { productId, type, quantity: qty, warehouse, reason: forms.invMovReason || '', reference: forms.invMovRef || '', date: forms.invMovDate || new Date().toISOString().split('T')[0], createdAt: ts, createdBy: authUser?.uid };

      // Atomic transaction: create movement + update product stock
      await db.runTransaction(async (transaction: Transaction) => {
        const productRef = db.collection('invProducts').doc(productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) throw new Error('Producto no encontrado');
        const productData = productDoc.data();
        const ws = productData.warehouseStock && typeof productData.warehouseStock === 'object' ? { ...productData.warehouseStock } : {};
        INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
        ws[warehouse] = type === 'Entrada' ? (ws[warehouse] || 0) + qty : Math.max(0, (ws[warehouse] || 0) - qty);
        const newTotal = Object.values(ws).reduce((s: number, v: unknown) => s + (Number(v) || 0), 0);
        transaction.set(db.collection('invMovements').doc(), { ...movementData, createdAt: getFirebase().firestore.FieldValue.serverTimestamp(), tenantId });
        transaction.update(productRef, { stock: newTotal, warehouseStock: ws, updatedAt: getFirebase().firestore.FieldValue.serverTimestamp() });
      });

      showToast(`${type === 'Entrada' ? 'Entrada' : 'Salida'} registrada en ${warehouse}: ${qty} uds`);
      closeModal('invMovement'); setForms(p => ({ ...p, invMovProduct: '', invMovType: 'Entrada', invMovWarehouse: 'Almacén Principal', invMovQty: '', invMovReason: '', invMovRef: '', invMovDate: '' }));
    } catch (err: unknown) {
      console.error('[ArchiFlow] Error en movimiento:', err);
      showToast(err instanceof Error ? err.message : 'Error al registrar movimiento', 'error');
    }
  };

  const deleteInvMovement = async (id: string) => {
    if (!(await confirm({ title: 'Eliminar movimiento', description: '¿Eliminar movimiento? El stock se revertirá automáticamente.', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try {
      const db = getFirebase().firestore();
      await db.runTransaction(async (transaction: Transaction) => {
        const movRef = db.collection('invMovements').doc(id);
        const movDoc = await transaction.get(movRef);
        if (!movDoc.exists) throw new Error('Movimiento no encontrado');
        const movData = movDoc.data();
        const productId = movData.productId;
        const type = movData.type;
        const qty = movData.quantity || 0;
        const warehouse = movData.warehouse;
        if (!productId || !qty) throw new Error('Datos de movimiento inválidos');
        // Reverse stock: Entrada added stock → subtract; Salida removed stock → add back
        const productRef = db.collection('invProducts').doc(productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) throw new Error('Producto no encontrado');
        const productData = productDoc.data();
        const ws = productData.warehouseStock && typeof productData.warehouseStock === 'object' ? { ...productData.warehouseStock } : {};
        INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
        if (type === 'Entrada') {
          ws[warehouse] = Math.max(0, (ws[warehouse] || 0) - qty);
        } else {
          ws[warehouse] = (ws[warehouse] || 0) + qty;
        }
        const newTotal = Object.values(ws).reduce((s: number, v: unknown) => s + (Number(v) || 0), 0);
        const fbTs = getFirebase().firestore.FieldValue.serverTimestamp();
        transaction.delete(movRef);
        transaction.update(productRef, { stock: newTotal, warehouseStock: ws, updatedAt: fbTs });
      });
      showToast('Movimiento eliminado — stock revertido');
    } catch (err) {
      console.error('[ArchiFlow] Error eliminando movimiento:', err);
      showToast('Error al eliminar movimiento', 'error');
    }
  };

  // --- Transfers (with runTransaction for atomicity) ---
  const saveInvTransfer = async () => {
    const productId = forms.invTrProduct || '';
    const qty = Number(forms.invTrQty) || 0;
    const from = forms.invTrFrom || '';
    const to = forms.invTrTo || '';
    if (!productId || !from || !to || from === to || qty <= 0) { showToast('Completa todos los campos y asegúrate que los almacenes sean diferentes', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const transferDate = forms.invTrDate || new Date().toISOString().split('T')[0];
      const transferNotes = forms.invTrNotes || '';

      // Atomic transaction: update stock + create transfer record
      await db.runTransaction(async (transaction: Transaction) => {
        const productRef = db.collection('invProducts').doc(productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) throw new Error('Producto no encontrado');
        const productData = productDoc.data();
        const ws = productData.warehouseStock && typeof productData.warehouseStock === 'object' ? { ...productData.warehouseStock } : {};
        INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
        const fromStock = ws[from] || 0;
        if (qty > fromStock) throw new Error(`Stock insuficiente en ${from}. Disponible: ${fromStock}`);
        ws[from] = Math.max(0, fromStock - qty);
        ws[to] = (ws[to] || 0) + qty;
        const newTotal = Object.values(ws).reduce((s: number, v: unknown) => s + (Number(v) || 0), 0);
        const fbTs = getFirebase().firestore.FieldValue.serverTimestamp();
        transaction.update(productRef, { stock: newTotal, warehouseStock: ws, updatedAt: fbTs });
        transaction.set(db.collection('invTransfers').doc(), {
          productId, productName: productData.name || '', fromWarehouse: from, toWarehouse: to,
          quantity: qty, status: 'Completada', date: transferDate, notes: transferNotes,
          createdAt: fbTs, createdBy: authUser?.uid, completedAt: fbTs, tenantId
        });
      });

      showToast(`Transferencia completada: ${qty} uds de ${from} → ${to}`);
      closeModal('invTransfer'); setForms(p => ({ ...p, invTrProduct: '', invTrFrom: '', invTrTo: '', invTrQty: '', invTrDate: '', invTrNotes: '' }));
    } catch (err: unknown) {
      console.error('[ArchiFlow] Error en transferencia:', err);
      showToast(err instanceof Error ? err.message : 'Error en transferencia', 'error');
    }
  };

  const deleteInvTransfer = async (id: string) => {
    if (!(await confirm({ title: 'Eliminar transferencia', description: '¿Eliminar transferencia? El stock se revertirá automáticamente.', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try {
      const db = getFirebase().firestore();
      await db.runTransaction(async (transaction: Transaction) => {
        const trRef = db.collection('invTransfers').doc(id);
        const trDoc = await transaction.get(trRef);
        if (!trDoc.exists) throw new Error('Transferencia no encontrada');
        const trData = trDoc.data();
        const productId = trData.productId;
        const qty = trData.quantity || 0;
        const fromWarehouse = trData.fromWarehouse;
        const toWarehouse = trData.toWarehouse;
        const status = trData.status;
        if (!productId || !qty || !fromWarehouse || !toWarehouse) throw new Error('Datos de transferencia inválidos');
        // Only reverse stock for completed transfers
        if (status === 'Completada') {
          const productRef = db.collection('invProducts').doc(productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) throw new Error('Producto no encontrado');
          const productData = productDoc.data();
          const ws = productData.warehouseStock && typeof productData.warehouseStock === 'object' ? { ...productData.warehouseStock } : {};
          INV_WAREHOUSES.forEach(w => { if (ws[w] === undefined) ws[w] = 0; });
          // Reverse: add back to source, subtract from destination
          ws[fromWarehouse] = (ws[fromWarehouse] || 0) + qty;
          ws[toWarehouse] = Math.max(0, (ws[toWarehouse] || 0) - qty);
          const newTotal = Object.values(ws).reduce((s: number, v: unknown) => s + (Number(v) || 0), 0);
          const fbTs = getFirebase().firestore.FieldValue.serverTimestamp();
          transaction.delete(trRef);
          transaction.update(productRef, { stock: newTotal, warehouseStock: ws, updatedAt: fbTs });
        } else {
          transaction.delete(trRef);
        }
      });
      showToast('Transferencia eliminada — stock revertido');
    } catch (err) {
      console.error('[ArchiFlow] Error eliminando transferencia:', err);
      showToast('Error al eliminar transferencia', 'error');
    }
  };

  // ===== LOOKUP FUNCTIONS =====

  const getInvCategoryName = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.name : 'Sin categoría'; };
  const getInvCategoryColor = (catId: string) => { const c = invCategories.find(x => x.id === catId); return c ? c.data.color : '#6b7280'; };
  const getInvProductName = (prodId: string) => { const p = invProducts.find(x => x.id === prodId); return p ? p.data.name : 'Desconocido'; };

  // ===== IMAGE HANDLER =====

  const handleInvProductImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; }
    if (file.size > 3 * 1024 * 1024) { showToast('Máx 3 MB', 'error'); return; }
    try { const base64 = await fileToBase64(file); setForms(p => ({ ...p, invProdImage: base64 })); }
    catch (err) { console.error('[ArchiFlow] Inventory: process product image failed:', err); showToast('Error al procesar', 'error'); }
  };

  // ===== COMPUTED VALUES =====

  const invTotalValue = invProducts.reduce((s, p) => s + (Number(p.data?.price) || 0) * getTotalStock(p), 0);
  const invLowStock = invProducts.filter(p => getTotalStock(p) <= (Number(p.data?.minStock) || 0));
  const invTotalStock = invProducts.reduce((s, p) => s + getTotalStock(p), 0);
  const invPendingTransfers = invTransfers.filter(t => t.data?.status === 'Pendiente' || t.data?.status === 'En tránsito').length;
  const invAlerts = [
    ...(invLowStock.map(p => ({ type: 'low_stock' as const, msg: `${p.data?.name || 'Producto'}: stock ${getTotalStock(p)} (mín: ${p.data?.minStock || 0})`, severity: 'high' as const }))),
    ...(invTransfers.filter(t => t.data?.status === 'Pendiente').map(t => ({ type: 'pending_transfer' as const, msg: `Transferencia pendiente: ${t.data?.quantity || 0} uds de ${t.data?.fromWarehouse || '?'} → ${t.data?.toWarehouse || '?'}`, severity: 'medium' as const }))),
    ...(invProducts.filter(p => getTotalStock(p) === 0).map(p => ({ type: 'out_of_stock' as const, msg: `${p.data?.name || 'Producto'}: AGOTADO`, severity: 'critical' as const }))),
  ];

  // ===== PROVIDER =====

  const value: InventoryContextType = useMemo(() => ({
    invProducts, setInvProducts, invCategories, setInvCategories,
    invMovements, setInvMovements, invTransfers, setInvTransfers,
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
  }), [invProducts, invCategories, invMovements, invTransfers, invTab, invFilterCat, invSearch, invMovFilterType, invTransferFilterStatus, invWarehouseFilter, getWarehouseStock, getTotalStock, buildWarehouseStock, saveInvProduct, deleteInvProduct, openEditInvProduct, saveInvCategory, deleteInvCategory, openEditInvCategory, saveInvMovement, deleteInvMovement, saveInvTransfer, deleteInvTransfer, getInvCategoryName, getInvCategoryColor, getInvProductName, handleInvProductImageSelect, invTotalValue, invLowStock, invTotalStock, invPendingTransfers, invAlerts]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventoryContext() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventoryContext must be used within InventoryProvider');
  return ctx;
}
