import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/**
 * Sizing and focus follow the RentFlow design rather than shadcn's defaults:
 * the design specifies `px-4 py-2.5 text-sm` — a 40px control — with a 2px
 * blue-500 focus ring, where shadcn ships a 32px control and a soft ring.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-4 py-2.5 text-sm transition-colors outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-slate-400",
        "focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
    />
  )
}

export { Input }
