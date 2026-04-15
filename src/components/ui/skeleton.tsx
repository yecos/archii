import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[linear-gradient(90deg,var(--skeuo-inset)_0%,var(--skeuo-raised)_20%,rgba(200,169,110,0.12)_40%,var(--skeuo-raised)_60%,var(--skeuo-inset)_100%)] bg-[size:400%_100%] animate-[af-shimmer_2s_ease-in-out_infinite] rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
