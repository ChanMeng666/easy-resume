import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Neobrutalism styled textarea with bold borders and shadow on focus.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-lg border-2 border-black bg-white px-4 py-3 text-sm font-medium transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] focus:translate-x-[-2px] focus:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
