import { useEffect, useRef, useState } from "react"
import { categoryIcon } from "@/components/brand"
import { prepareSegments, renderSegments, type PreparedSegments } from "@/lib/segment"
import type { Box } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface PhotoPart {
  box: Box | null
  /** overlay colour (vivid shade) */
  color: string
  /** tag colour, dark enough for white text */
  tagColor: string
  categoryId: string | null
  n: number
  label: string
}

interface Props {
  src: string
  parts: PhotoPart[]
  /** index into parts of the highlighted item */
  active: number | null
  onSelect: (index: number | null) => void
  className?: string
}

/** The scan photo with the background dimmed and each item outlined, tinted and tagged in its bin colour. */
export function SegmentedPhoto({ src, parts, active, onSelect, className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [prep, setPrep] = useState<PreparedSegments | null>(null)
  const boxesKey = JSON.stringify(parts.map((p) => p.box))
  const colors = parts.map((p) => p.color)

  useEffect(() => {
    let alive = true
    setPrep(null)
    prepareSegments(src, parts.map((p) => p.box))
      .then((p) => alive && setPrep(p))
      .catch((err) => console.warn("Couldn't draw item masks:", err))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, boxesKey])

  useEffect(() => {
    if (prep && canvas.current) renderSegments(canvas.current, prep, colors, active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep, active, colors.join()])

  // tap on the photo: pick the smallest box under the finger
  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    let best: number | null = null
    let bestArea = Infinity
    parts.forEach((p, i) => {
      const b = p.box
      if (!b || x < b.left || x > b.right || y < b.top || y > b.bottom) return
      const area = (b.right - b.left) * (b.bottom - b.top)
      if (area < bestArea) {
        best = i
        bestArea = area
      }
    })
    onSelect(best === active ? null : best)
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[22px] bg-ink shadow-lift ring-1 ring-black/5", className)}>
      <div className="relative cursor-pointer" onClick={pick}>
        <img src={src} alt="Your photo, with each item outlined in its bin colour" className="block h-auto w-full select-none" draggable={false} />
        <canvas
          ref={canvas}
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500", prep ? "opacity-100" : "opacity-0")}
        />
      </div>
      {prep &&
        parts.map((p, i) => {
          if (!p.box) return null
          const Icon = categoryIcon(p.categoryId ?? "")
          const below = p.box.top < 0.1
          const alignRight = p.box.left > 0.62
          const dimmed = active !== null && active !== i
          return (
            <div
              key={p.n}
              className={cn("absolute flex max-w-[48%]", active === i && "z-10")}
              style={{
                top: below ? `calc(${p.box.top * 100}% + 8px)` : `calc(${p.box.top * 100}% - 8px)`,
                left: alignRight ? undefined : `max(8px, ${p.box.left * 100}%)`,
                right: alignRight ? `max(8px, ${(1 - p.box.right) * 100}%)` : undefined,
                transform: below ? undefined : "translateY(-100%)",
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(active === i ? null : i)}
                aria-pressed={active === i}
                aria-label={`Item ${p.n}: ${p.label}`}
                className={cn(
                  "ww-pop flex min-w-0 items-center gap-1 rounded-full border-2 border-white py-0.5 pr-2 pl-0.5 text-xs font-bold sm:gap-1.5 sm:py-1 sm:pr-3 sm:pl-1 text-white shadow-lift transition-[opacity,scale] duration-300",
                  dimmed ? "scale-95 opacity-45" : "opacity-100",
                  active === i && "scale-110"
                )}
                style={{ backgroundColor: p.tagColor, animationDelay: `${i * 70}ms` }}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold sm:h-6 sm:w-6" style={{ color: p.tagColor }}>
                  {p.n}
                </span>
                <Icon size={13} className="shrink-0 opacity-90" aria-hidden />
                <span className="hidden truncate capitalize sm:inline">{p.label}</span>
              </button>
            </div>
          )
        })}
    </div>
  )
}
