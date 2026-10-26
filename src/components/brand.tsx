import { Cpu, Leaf, Recycle, Trash2, TriangleAlert, type LucideIcon } from "lucide-react"
import { getCategory } from "@/lib/categories"
import { levelFor } from "@/lib/levels"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A forest-green leaf inside a circular arrow. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    // forest green in the light theme, lighter green in the dark one (text-green follows the theme)
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="text-green">
      <path d="M16 4.5a11.5 11.5 0 1 0 11.2 8.8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M27.8 8.4l-.5 5-4.8-1.4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 21.5c0-6.4 4.3-10.2 10.8-10.2 0 6.4-3.9 10.7-10.8 10.2Z" fill="currentColor" />
      <path d="M12.2 19.9c2.2-2.6 4.3-4.3 7-5.9" stroke="var(--color-mint)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const ICONS: Record<string, LucideIcon> = {
  dry: Recycle,
  wet: Leaf,
  hazardous: TriangleAlert,
  reject: Trash2,
  ewaste: Cpu,
}

export function categoryIcon(id: string): LucideIcon {
  return ICONS[id] ?? Trash2
}

/** Small badge for lists. */
export function CategoryChip({ categoryId, className }: { categoryId: string | null; className?: string }) {
  const c = getCategory(categoryId)
  if (!c) {
    return (
      <span className={cn("inline-flex items-center rounded-full bg-slate px-2.5 py-1 text-[11px] font-semibold text-white", className)}>
        Not sorted
      </span>
    )
  }
  const Icon = categoryIcon(c.id)
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white", className)}
      style={{ background: c.color }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {c.label}
    </span>
  )
}

/** Large result badge, e.g. "DRY WASTE — Blue bin". */
export function CategoryBadge({ category, compact }: { category: Category; compact?: boolean }) {
  const Icon = categoryIcon(category.id)
  return (
    <div
      className={cn("ww-pop flex items-center gap-3 rounded-[18px] text-white", compact ? "px-3 py-2.5" : "px-4 py-3.5")}
      style={{ background: category.color }}
    >
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-white/20", compact ? "h-9 w-9" : "h-12 w-12")}>
        <Icon size={compact ? 18 : 24} />
      </span>
      <span className="min-w-0">
        <span className={cn("block leading-tight font-bold tracking-wide uppercase", compact ? "text-sm" : "text-lg")}>{category.label}</span>
        <span className={cn("block opacity-90", compact ? "text-xs" : "text-sm")}>{category.bin}</span>
      </span>
    </div>
  )
}

export function LevelBadge({ points, className }: { points: number; className?: string }) {
  const { level } = levelFor(points)
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-medium text-green", className)}>
      <span aria-hidden="true">{level.badge}</span>
      {level.name}
    </span>
  )
}

export function Thumb({ src, size = 48, className }: { src: string | null; size?: number; className?: string }) {
  return src ? (
    <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-[12px] object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-[12px] bg-mint text-green", className)} style={{ width: size, height: size }}>
      <Leaf size={size * 0.4} />
    </span>
  )
}

export function confidenceLabel(c: string | null | undefined) {
  if (c === "high") return "High confidence"
  if (c === "medium") return "Medium confidence"
  if (c === "low") return "Low confidence"
  return null
}
