'use client';

import React from 'react';

/* ===== Reusable Form Field ===== */
interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

/* ===== Reusable Input ===== */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // extends all native input props
}

export function FormInput({ className = '', ...props }: FormInputProps) {
  return (
    <input
      className={`w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] ${className}`}
      {...props}
    />
  );
}

/* ===== Reusable Select ===== */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function FormSelect({ className = '', children, ...props }: FormSelectProps) {
  return (
    <select
      className={`w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

/* ===== Reusable Textarea ===== */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // extends all native textarea props
}

export function FormTextarea({ className = '', ...props }: FormTextareaProps) {
  return (
    <textarea
      className={`w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] resize-none ${className}`}
      {...props}
    />
  );
}

/* ===== Reusable Modal Footer ===== */
interface ModalFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  submitColor?: string;
}

export function ModalFooter({ onCancel, onSubmit, submitLabel, cancelLabel = 'Cancelar', submitDisabled, submitColor = 'bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)]' }: ModalFooterProps) {
  return (
    <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[var(--border)]">
      <button
        className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent text-[var(--muted-foreground)] border border-[var(--input)] hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-all"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        className={`px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors ${submitColor}`}
        onClick={onSubmit}
        disabled={submitDisabled}
      >
        {submitLabel}
      </button>
    </div>
  );
}
