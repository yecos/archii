"use client"

import { useCallback, useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

// ── State management outside React (simple global store) ──────────────────────

type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

let resolveRef: ((value: boolean) => void) | null = null
let optionsRef: Required<ConfirmOptions> = {
  title: "Confirmar",
  description: "¿Estás seguro?",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  variant: "default",
}

/** Show the confirm dialog and return a promise (replaces window.confirm) */
export function confirm(opts?: string | ConfirmOptions): Promise<boolean> {
  if (typeof opts === "string") {
    optionsRef = { ...optionsRef, description: opts }
  } else {
    optionsRef = { ...optionsRef, ...opts }
  }
  return new Promise<boolean>((resolve) => {
    resolveRef = resolve
    emitChange()
  })
}

const getListeners = new Set<() => void>()

function emitChange() {
  getListeners.forEach((fn) => fn())
}

function subscribe(listener: () => void) {
  getListeners.add(listener)
  return () => getListeners.delete(listener)
}

// ── Hook: useConfirmDialog ───────────────────────────────────────────────────

/** Hook that must be mounted ONCE in the app (e.g. in AppProviders.tsx) */
export function useConfirmDialog() {
  // Track open state through React state so ConfirmDialog re-renders properly
  const [isOpen, setIsOpen] = useState(false)

  // Sync external changes to React state via listener
  useEffect(() => {
    const listener = () => { setIsOpen(resolveRef !== null) }
    getListeners.add(listener)
    // Initial sync in case a confirm() was called before mount
    setIsOpen(resolveRef !== null)
    return () => { getListeners.delete(listener) }
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resolveRef?.(false)
      resolveRef = null
      emitChange()
      setIsOpen(false)
    }
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef?.(true)
    resolveRef = null
    emitChange()
    setIsOpen(false)
  }, [])

  return { isOpen, handleOpenChange, handleConfirm }
}

// ── Component: ConfirmDialog (mount once in layout) ──────────────────────────

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{optionsRef.title}</AlertDialogTitle>
          <AlertDialogDescription>{optionsRef.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {optionsRef.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              optionsRef.variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {optionsRef.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
