import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends ComponentProps<"div"> {
  /** position in a staggered list: fades up 40ms after the previous card */
  index?: number
}

/** White card on the off-white page. */
export function Card({ className, index, style, ...props }: CardProps) {
  const s: CSSProperties | undefined = index !== undefined ? { animationDelay: `${index * 40}ms`, ...style } : style
  return <div className={cn("glass p-5", index !== undefined && "ww-fade-up", className)} style={s} {...props} />
}

/** Mint badge, like "Trusted by 120,000+ indie makers". */
export function Mark({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("badge-mint", className)}>{children}</span>
}

/** Hand-drawn note in Caveat, optionally tilted. */
export function Note({ children, className, tilt = 0 }: { children: ReactNode; className?: string; tilt?: number }) {
  return (
    <span className={cn("note inline-block", className)} style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}>
      {children}
    </span>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="display text-lg">{children}</h2>
      {action}
    </div>
  )
}
