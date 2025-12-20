import { cn } from "@/lib/utils"

/**
 * Neobrutalism styled skeleton loader with border and striped animation.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-200 border-2 border-black",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
