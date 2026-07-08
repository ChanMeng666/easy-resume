import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Phantom badge — soft pills with tonal fills, no borders or shadows
 * (except the quiet outline variant).
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-bone text-aubergine",
        secondary:
          "bg-ash text-obsidian",
        accent:
          "bg-periwinkle/30 text-aubergine",
        success:
          "bg-mint/15 text-mint-ink",
        warning:
          "bg-buttercream text-buttercream-ink",
        destructive:
          "bg-blush text-rose-ink",
        outline:
          "border border-ash text-foreground",
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
 * Phantom styled badge component.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
