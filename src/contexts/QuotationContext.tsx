'use client';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import { useTenantId } from '@/hooks/useTenantId';
import type { Quotation, QuotationSection, QuotationItem, QuotationPayment } from '@/lib/types';
import * as fbActions from '@/lib/firestore-actions';

/* ===== HELPER: create empty item ===== */
function makeEmptyItem(): QuotationItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    concept: '',
    description: '',
    unit: 'Unidad',
    quantity: 1,
    unitPrice: 0,
    vat: 19,
    discount: 0,
    subtotal: 0,
    vatAmount: 0,
    discountAmount: 0,
    total: 0,
  };
}

function makeEmptySection(): QuotationSection {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    items: [makeEmptyItem()],
    subtotal: 0,
    vatTotal: 0,
    discountTotal: 0,
    total: 0,
  };
}

function makeDefaultPayments(): QuotationPayment[] {
  return [
    { id: `pay-${Date.now()}-1`, label: 'Anticipo', condition: 'Al inicio', percentage: 30, amount: 0, paid: false },
    { id: `pay-${Date.now()}-2`, label: 'Segundo pago', condition: 'Al 50%', percentage: 30, amount: 0, paid: false },
    { id: `pay-${Date.now()}-3`, label: 'Pago final', condition: 'Entrega', percentage: 40, amount: 0, paid: false },
  ];
}

/* ===== QUOTATION CONTEXT ===== */
interface QuotationContextType {
  // Collection state
  quotations: Quotation[];
  setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
  // Domain UI state
  quotationTab: string;
  setQuotationTab: React.Dispatch<React.SetStateAction<string>>;
  quotationFilterStatus: string;
  setQuotationFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  // Form state
  quoteSections: QuotationSection[];
  setQuoteSections: React.Dispatch<React.SetStateAction<QuotationSection[]>>;
  quotePayments: QuotationPayment[];
  setQuotePayments: React.Dispatch<React.SetStateAction<QuotationPayment[]>>;
  // CRUD
  openNewQuotation: () => void;
  openEditQuotation: (q: Quotation) => void;
  saveQuotation: () => void;
  updateQuotationStatus: (id: string, status: string) => void;
  duplicateQuotation: (id: string) => void;
  deleteQuotation: (id: string) => void;
  // Section management
  addSection: () => void;
  removeSection: (idx: number) => void;
  updateSection: (idx: number, field: string, value: unknown) => void;
  // Item management
  addItem: (sectionIdx: number) => void;
  removeItem: (sectionIdx: number, itemIdx: number) => void;
  updateItem: (sectionIdx: number, itemIdx: number, field: string, value: unknown) => void;
  // Payment management
  addPayment: () => void;
  removePayment: (idx: number) => void;
  updatePayment: (idx: number, field: string, value: unknown) => void;
}

const QuotationContext = createContext<QuotationContextType | null>(null);

export default function QuotationProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms, editingId, setEditingId } = useUIContext();
  const { ready, authUser } = useAuthContext();
  const tenantId = useTenantId();

  // ===== COLLECTION STATE =====
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  // ===== DOMAIN UI STATE =====
  const [quotationTab, setQuotationTab] = useState<string>('list');
  const [quotationFilterStatus, setQuotationFilterStatus] = useState<string>('all');

  // ===== FORM STATE =====
  const [quoteSections, setQuoteSections] = useState<QuotationSection[]>([makeEmptySection()]);
  const [quotePayments, setQuotePayments] = useState<QuotationPayment[]>(makeDefaultPayments());

  // ===== EFFECTS =====

  useEffect(() => {
    if (!ready || !authUser || !tenantId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('quotations').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: QuerySnapshot) => {
      setQuotations(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando quotations:', err); });
    return () => unsub();
  }, [ready, authUser, tenantId]);

  // ===== RECALCULATE SECTION =====
  const recalcSection = useCallback((sec: QuotationSection): QuotationSection => {
    const items = sec.items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const vat = Number(item.vat) ?? 19;
      const disc = Number(item.discount) || 0;
      const sub = qty * price;
      return {
        ...item,
        subtotal: sub,
        vatAmount: sub * vat / 100,
        discountAmount: sub * disc / 100,
        total: sub + (sub * vat / 100) - (sub * disc / 100),
      };
    });
    const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
    const vatTotal = items.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const discountTotal = items.reduce((s, i) => s + (i.discountAmount || 0), 0);
    return { ...sec, items, subtotal, vatTotal, discountTotal, total: subtotal + vatTotal - discountTotal };
  }, []);

  // ===== CRUD FUNCTIONS =====

  const openNewQuotation = useCallback(() => {
    setEditingId(null);
    const newSection = makeEmptySection();
    newSection.name = 'Sección 1';
    setQuoteSections([newSection]);
    setQuotePayments(makeDefaultPayments());
    setForms(p => ({
      ...p,
      qProjId: '',
      qNumber: '',
      qStatus: 'Borrador',
      qClientName: '',
      qClientEmail: '',
      qClientPhone: '',
      qClientAddress: '',
      qValidUntil: '',
      qNotes: '',
      qInternalNotes: '',
      qTerms: '',
      qBankName: '',
      qBankAccount: '',
      qBankAccountType: '',
      qBankHolder: '',
    }));
    setQuotationTab('create');
  }, [setEditingId, setForms]);

  const openEditQuotation = useCallback((q: Quotation) => {
    setEditingId(q.id);
    setQuoteSections(q.data.sections && q.data.sections.length > 0 ? q.data.sections : [makeEmptySection()]);
    setQuotePayments(q.data.payments && q.data.payments.length > 0 ? q.data.payments : makeDefaultPayments());
    setForms(p => ({
      ...p,
      qProjId: q.data.projectId || '',
      qNumber: q.data.number || '',
      qStatus: q.data.status || 'Borrador',
      qClientName: q.data.clientName || '',
      qClientEmail: q.data.clientEmail || '',
      qClientPhone: q.data.clientPhone || '',
      qClientAddress: q.data.clientAddress || '',
      qValidUntil: q.data.validUntil || '',
      qNotes: q.data.notes || '',
      qInternalNotes: q.data.internalNotes || '',
      qTerms: q.data.terms || '',
      qBankName: q.data.bankName || '',
      qBankAccount: q.data.bankAccount || '',
      qBankAccountType: q.data.bankAccountType || '',
      qBankHolder: q.data.bankHolder || '',
    }));
    setQuotationTab('edit');
  }, [setEditingId, setForms]);

  const saveQuotation = useCallback(() => {
    if (!forms.qClientName) { showToast('Ingresa el nombre del cliente', 'error'); return; }
    if (!tenantId) { showToast('Tenant no disponible', 'error'); return; }
    fbActions.saveQuotation({
      projId: forms.qProjId,
      number: forms.qNumber || '',
      status: forms.qStatus || 'Borrador',
      clientName: forms.qClientName,
      clientEmail: forms.qClientEmail,
      clientPhone: forms.qClientPhone,
      clientAddress: forms.qClientAddress,
      sections: quoteSections,
      payments: quotePayments,
      validUntil: forms.qValidUntil || '',
      notes: forms.qNotes || '',
      internalNotes: forms.qInternalNotes || '',
      terms: forms.qTerms || '',
      bankName: forms.qBankName || '',
      bankAccount: forms.qBankAccount || '',
      bankAccountType: forms.qBankAccountType || '',
      bankHolder: forms.qBankHolder || '',
    }, editingId, showToast, authUser, tenantId);
    setQuotationTab('list');
  }, [forms, quoteSections, quotePayments, editingId, showToast, authUser, tenantId]);

  const handleUpdateStatus = useCallback((id: string, status: string) => {
    fbActions.updateQuotationStatus(id, status, showToast);
  }, [showToast]);

  const handleDuplicate = useCallback((id: string) => {
    if (!tenantId) return;
    fbActions.duplicateQuotation(id, showToast, authUser, tenantId);
  }, [showToast, authUser, tenantId]);

  const handleDelete = useCallback((id: string) => {
    fbActions.deleteQuotation(id, showToast);
  }, [showToast]);

  // ===== SECTION MANAGEMENT =====

  const addSection = useCallback(() => {
    const sec = makeEmptySection();
    sec.name = `Sección ${quoteSections.length + 1}`;
    setQuoteSections(prev => [...prev, sec]);
  }, [quoteSections.length]);

  const removeSection = useCallback((idx: number) => {
    if (quoteSections.length <= 1) return;
    setQuoteSections(prev => prev.filter((_, i) => i !== idx));
  }, [quoteSections.length]);

  const updateSection = useCallback((idx: number, field: string, value: unknown) => {
    setQuoteSections(prev => {
      const sections = [...prev];
      sections[idx] = { ...sections[idx], [field]: value };
      return sections.map(recalcSection);
    });
  }, [recalcSection]);

  // ===== ITEM MANAGEMENT =====

  const addItem = useCallback((sectionIdx: number) => {
    setQuoteSections(prev => {
      const sections = [...prev];
      const sec = { ...sections[sectionIdx] };
      sec.items = [...sec.items, makeEmptyItem()];
      sections[sectionIdx] = recalcSection(sec);
      return sections;
    });
  }, [recalcSection]);

  const removeItem = useCallback((sectionIdx: number, itemIdx: number) => {
    setQuoteSections(prev => {
      const sections = [...prev];
      const sec = { ...sections[sectionIdx] };
      if (sec.items.length <= 1) return prev; // don't remove last item
      sec.items = sec.items.filter((_, i) => i !== itemIdx);
      sections[sectionIdx] = recalcSection(sec);
      return sections;
    });
  }, [recalcSection]);

  const updateItem = useCallback((sectionIdx: number, itemIdx: number, field: string, value: unknown) => {
    setQuoteSections(prev => {
      const sections = [...prev];
      const sec = { ...sections[sectionIdx] };
      const items = [...sec.items];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      sec.items = items;
      sections[sectionIdx] = recalcSection(sec);
      return sections;
    });
  }, [recalcSection]);

  // ===== PAYMENT MANAGEMENT =====

  const addPayment = useCallback(() => {
    setQuotePayments(prev => [...prev, {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      condition: '',
      percentage: 0,
      amount: 0,
      paid: false,
    }]);
  }, []);

  const removePayment = useCallback((idx: number) => {
    setQuotePayments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updatePayment = useCallback((idx: number, field: string, value: unknown) => {
    setQuotePayments(prev => {
      const payments = [...prev];
      payments[idx] = { ...payments[idx], [field]: value };
      return payments;
    });
  }, []);

  // ===== PROVIDER =====

  const value: QuotationContextType = useMemo(() => ({
    quotations, setQuotations,
    quotationTab, setQuotationTab,
    quotationFilterStatus, setQuotationFilterStatus,
    quoteSections, setQuoteSections,
    quotePayments, setQuotePayments,
    openNewQuotation, openEditQuotation, saveQuotation,
    updateQuotationStatus: handleUpdateStatus,
    duplicateQuotation: handleDuplicate,
    deleteQuotation: handleDelete,
    addSection, removeSection, updateSection,
    addItem, removeItem, updateItem,
    addPayment, removePayment, updatePayment,
  }), [quotations, quotationTab, quotationFilterStatus, quoteSections, quotePayments, openNewQuotation, openEditQuotation, saveQuotation, handleUpdateStatus, handleDuplicate, handleDelete, addSection, removeSection, updateSection, addItem, removeItem, updateItem, addPayment, removePayment, updatePayment]);

  return <QuotationContext.Provider value={value}>{children}</QuotationContext.Provider>;
}

export function useQuotationContext() {
  const ctx = useContext(QuotationContext);
  if (!ctx) throw new Error('useQuotationContext must be used within QuotationProvider');
  return ctx;
}
