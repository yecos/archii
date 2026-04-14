"use client"

import { useSyncExternalStore } from "react"
import { Toaster } from "@/components/ui/sonner"
import { useConfirmDialog, ConfirmDialog } from "@/hooks/useConfirmDialog"

export function AppProviders() {
  const { subscribe, getSnapshot, handleOpenChange, handleConfirm } = useConfirmDialog()

  // Sync with external confirm state
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <ConfirmDialog
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
      />
    </>
  )
}
