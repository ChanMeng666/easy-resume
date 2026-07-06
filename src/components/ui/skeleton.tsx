import { cn } from "@/lib/utils"

/**
 * Phantom skeleton loader — soft Ash block with a gentle pulse.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-ash",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
