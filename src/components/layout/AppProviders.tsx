"use client"

import { Toaster } from "@/components/ui/sonner"
import { useConfirmDialog, ConfirmDialog } from "@/hooks/useConfirmDialog"

const TOASTER_PROPS = {
  position: 'top-center' as const,
  toastOptions: {
    unstyled: false,
    classNames: {
      toast: 'af-sonner-toast',
      title: 'af-sonner-title',
      description: 'af-sonner-desc',
      actionButton: 'af-sonner-action',
      cancelButton: 'af-sonner-cancel',
      success: '!bg-emerald-600 !text-white !border-emerald-500',
      error: '!bg-red-500 !text-white !border-red-400',
      warning: '!bg-amber-500 !text-white !border-amber-400',
    },
  },
  richColors: true,
  closeButton: true,
  duration: 3500,
}

export function AppProviders() {
  const { isOpen, handleOpenChange, handleConfirm } = useConfirmDialog()

  return (
    <>
      <Toaster {...TOASTER_PROPS} />
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
      />
    </>
  )
}
