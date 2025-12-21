import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Neobrutalism styled badge variants (non-interactive style).
 * Badges have no borders or shadows to distinguish from clickable elements.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white",
        secondary:
          "bg-gray-100 text-foreground",
        destructive:
          "bg-destructive text-white",
        outline: 
          "bg-white text-foreground",
        accent:
          "bg-accent text-accent-foreground",
        success:
          "bg-green-500 text-white",
        warning:
          "bg-yellow-400 text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Neobrutalism styled badge component.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
