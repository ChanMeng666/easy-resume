import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Phantom button variants — pill geometry, whisper-weight type, flat surfaces.
 * The only elevation in the system is the lavender glow on the primary CTA.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-tight transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-lavender text-aubergine shadow-glow hover:bg-[#d6d2fd]",
        secondary:
          "bg-ash text-obsidian hover:bg-[#dedde0]",
        outline:
          "border border-ash bg-paper text-aubergine hover:bg-bone",
        ghost:
          "text-aubergine hover:bg-bone",
        link:
          "text-aubergine underline-offset-4 hover:underline",
        destructive:
          "bg-blush text-rose-ink hover:bg-[#ffcecf]",
        accent:
          "bg-periwinkle text-aubergine hover:bg-[#9d8ff0]",
        pop:
          "bg-cornflower text-white hover:bg-[#3f7ae8]",
        cream:
          "bg-buttercream text-obsidian hover:bg-[#f7f7b0]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

/**
 * Phantom styled button — soft pill with color-only hover transitions.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
