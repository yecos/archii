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
      className={`w-full skeuo-input px-3 py-2 text-sm ${className}`}
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
      className={`w-full skeuo-input px-3 py-2 text-sm ${className}`}
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
      className={`w-full skeuo-input px-3 py-2 text-sm resize-none ${className}`}
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

export function ModalFooter({ onCancel, onSubmit, submitLabel, cancelLabel = 'Cancelar', submitDisabled }: ModalFooterProps) {
  return (
    <div className="mt-5 pt-4">
      <div className="skeuo-divider mb-4" />
      <div className="flex gap-2 justify-end">
        <button
          className="skeuo-btn px-4 py-2 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className="skeuo-btn px-4 py-2 text-[13px] font-semibold bg-[var(--af-accent)] text-[var(--primary-foreground)] hover:bg-[var(--af-accent2)]"
          onClick={onSubmit}
          disabled={submitDisabled}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
