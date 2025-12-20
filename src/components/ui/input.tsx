import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Neobrutalism styled input with bold borders and shadow on focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] focus:translate-x-[-2px] focus:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
