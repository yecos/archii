'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import type { Invoice, InvoiceItem } from '@/lib/types';
import * as fbActions from '@/lib/firestore-actions';

/* ===== INVOICE CONTEXT ===== */
interface InvoiceContextType {
  // Collection state
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  // Domain UI state
  invoiceTab: string; setInvoiceTab: React.Dispatch<React.SetStateAction<string>>;
  invoiceItems: InvoiceItem[]; setInvoiceItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
  invoiceFilterStatus: string; setInvoiceFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  // CRUD
  openNewInvoice: () => void;
  updateInvoiceItem: (idx: number, field: string, value: string | number) => void;
  addInvoiceItem: () => void;
  removeInvoiceItem: (idx: number) => void;
  saveInvoice: () => void;
}

const InvoiceContext = createContext<InvoiceContextType | null>(null);

export default function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, editingId, setEditingId, setForms } = useUIContext();
  const { ready, authUser } = useAuthContext();

  // ===== COLLECTION STATE =====
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // ===== DOMAIN UI STATE =====
  const [invoiceTab, setInvoiceTab] = useState<string>('list');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState<string>('all');

  // ===== EFFECTS =====

  // Load invoices
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('invoices').orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: QuerySnapshot) => {
      setInvoices(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando invoices:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // ===== CRUD FUNCTIONS =====

  const openNewInvoice = () => {
    setEditingId(null);
    setInvoiceItems([{ concept: '', phase: '', hours: 0, rate: 50000, amount: 0 }]);
    setForms(p => ({ ...p, invProject: '', invNumber: '', invStatus: 'Borrador', invTax: 19, invNotes: '', invIssueDate: new Date().toISOString().split('T')[0], invDueDate: '' }));
    setInvoiceTab('create');
  };

  const updateInvoiceItem = (idx: number, field: string, value: any) => {
    setInvoiceItems(prev => { const items = [...prev]; items[idx] = { ...items[idx], [field]: value }; if (field === 'hours' || field === 'rate') items[idx].amount = (Number(items[idx].hours) || 0) * (Number(items[idx].rate) || 0); return items; });
  };

  const addInvoiceItem = () => setInvoiceItems(prev => [...prev, { concept: '', phase: '', hours: 0, rate: 50000, amount: 0 }]);

  const removeInvoiceItem = (idx: number) => { if (invoiceItems.length <= 1) return; setInvoiceItems(prev => prev.filter((_, i) => i !== idx)); };

  const saveInvoice = () => {
    if (!forms.invProject) { showToast('Selecciona un proyecto', 'error'); return; }
    const subtotal = invoiceItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const tax = Number(forms.invTax) || 19;
    const total = subtotal + (subtotal * tax / 100);
    fbActions.saveInvoice({ invProject: forms.invProject, invNumber: forms.invNumber || '', invStatus: forms.invStatus || 'Borrador', invItems: invoiceItems, invSubtotal: subtotal, invTax: tax, invTotal: total, invNotes: forms.invNotes || '', invIssueDate: forms.invIssueDate || new Date().toISOString().split('T')[0], invDueDate: forms.invDueDate || '' }, editingId, showToast, authUser);
    setInvoiceTab('list');
  };

  // ===== PROVIDER =====

  const value: InvoiceContextType = useMemo(() => ({
    invoices, setInvoices,
    invoiceTab, setInvoiceTab, invoiceItems, setInvoiceItems, invoiceFilterStatus, setInvoiceFilterStatus,
    openNewInvoice, updateInvoiceItem, addInvoiceItem, removeInvoiceItem, saveInvoice,
  }), [invoices, invoiceTab, invoiceItems, invoiceFilterStatus, openNewInvoice, updateInvoiceItem, addInvoiceItem, removeInvoiceItem, saveInvoice]);

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}

export function useInvoiceContext() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error('useInvoiceContext must be used within InvoiceProvider');
  return ctx;
}
