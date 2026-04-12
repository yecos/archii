'use client';

import React from 'react';
import { useAppStore } from '@/stores/app-store';

interface FormFieldProps {
  label: string;
  formKey: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  rows?: number;
  options?: { value: string; label: string }[];
}

export default function FormField({ label, formKey, placeholder, type = 'text', required, wide, rows, options }: FormFieldProps) {
  const forms = useAppStore(s => s.forms);
  const setForms = useAppStore(s => s.setForms);
  const value = forms[formKey] || '';

  const baseClass = "w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]";
  const labelClass = "block text-xs font-medium text-[var(--muted-foreground)] mb-1.5";

  if (options) {
    return (
      <div className={wide ? 'col-span-2' : ''}>
        <label className={labelClass}>{label} {required && '*'}</label>
        <select className={`${baseClass} cursor-pointer`} value={value} onChange={e => setForms((p: any) => ({ ...p, [formKey]: e.target.value }))}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  if (rows) {
    return (
      <div className={wide ? 'col-span-2' : ''}>
        <label className={labelClass}>{label} {required && '*'}</label>
        <textarea className={`${baseClass} resize-none`} rows={rows} placeholder={placeholder} value={value} onChange={e => setForms((p: any) => ({ ...p, [formKey]: e.target.value }))} />
      </div>
    );
  }

  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className={labelClass}>{label} {required && '*'}</label>
      <input className={baseClass} type={type} placeholder={placeholder} value={value} onChange={e => setForms((p: any) => ({ ...p, [formKey]: e.target.value }))} />
    </div>
  );
}
