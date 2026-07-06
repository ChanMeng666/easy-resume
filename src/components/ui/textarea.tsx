import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Phantom textarea — soft rounded field with a 1px Ash border and a periwinkle
 * focus ring. No displacement, no shadow.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-2xl border border-ash bg-white px-4 py-3 text-sm transition-colors duration-200 placeholder:text-muted-foreground focus:outline-none focus:border-periwinkle focus:ring-2 focus:ring-periwinkle/40 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
