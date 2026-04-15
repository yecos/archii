"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        /* Neo-Skeuomorphic inset track */
        "peer inline-flex h-[1.25rem] w-[2.5rem] shrink-0 items-center rounded-full",
        "border border-[var(--skeuo-edge-dark)]",
        "shadow-[var(--skeuo-shadow-inset-sm)]",
        "transition-all duration-200 outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        /* Unchecked: recessed base */
        "data-[state=unchecked]:bg-[var(--skeuo-inset)]",
        /* Checked: accent glow */
        "data-[state=checked]:bg-[var(--primary)] data-[state=checked]:shadow-[var(--skeuo-shadow-inset-sm),0_0_8px_var(--skeuo-glow)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          /* Neo-Skeuomorphic raised thumb */
          "pointer-events-none block size-[1.05rem] rounded-full",
          "bg-gradient-to-b from-[var(--skeuo-raised)] to-[var(--card)]",
          "border border-[var(--skeuo-edge-light)]",
          "shadow-[var(--skeuo-shadow-raised-sm)]",
          "transition-transform duration-200",
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-[2px]",
          "dark:data-[state=unchecked]:bg-[var(--skeuo-raised)] dark:data-[state=checked]:bg-[var(--primary-foreground)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
