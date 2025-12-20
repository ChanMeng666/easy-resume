import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Neobrutalism button variants with hard shadows and bold borders.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 border-black",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] active:translate-x-[2px] active:translate-y-[2px]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] active:translate-x-[2px] active:translate-y-[2px]",
        outline:
          "bg-white text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-gray-50 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] active:translate-x-[2px] active:translate-y-[2px]",
        secondary:
          "bg-gray-100 text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-gray-200 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] active:translate-x-[2px] active:translate-y-[2px]",
        ghost: 
          "border-transparent shadow-none hover:bg-gray-100 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]",
        link: 
          "text-primary underline-offset-4 hover:underline border-transparent shadow-none",
        accent:
          "bg-accent text-accent-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] active:translate-x-[2px] active:translate-y-[2px]",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-lg",
        sm: "h-8 px-4 text-xs rounded-md",
        lg: "h-12 px-8 text-base rounded-xl",
        icon: "h-10 w-10 rounded-lg",
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
 * Neobrutalism styled button component with hard shadows and interactive states.
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
