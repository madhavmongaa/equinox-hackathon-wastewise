import { useEffect, useRef } from "react"
import { drawSegments } from "@/lib/segment"
import type { Box } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface PhotoPart {
  box: Box | null
  color: string
  n: number
  label: string
}

/** The scan photo with each item masked, outlined and numbered in its bin's colour. */
export function SegmentedPhoto({ src, parts, className }: { src: string; parts: PhotoPart[]; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(parts.map((p) => [p.box, p.color]))

  useEffect(() => {
    if (!canvas.current) return
    const segments = parts.flatMap((p) => (p.box ? [{ box: p.box, color: p.color }] : []))
    drawSegments(canvas.current, src, segments).catch((err) => console.warn("Couldn't draw item masks:", err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, key])

  return (
    <div className={cn("relative overflow-hidden rounded-[18px] border-[6px] border-white shadow-lift", className)}>
      <img src={src} alt="Your photo with each item outlined by bin colour" className="block h-auto w-full" />
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      {parts.map((p) =>
        p.box ? (
          <span
            key={p.n}
            className="absolute flex max-w-[45%] -translate-y-1/2 items-center gap-1 truncate rounded-full py-0.5 pr-2 pl-0.5 text-[11px] font-bold text-white shadow-soft"
            style={{ top: `${p.box.top * 100}%`, left: `${p.box.left * 100}%`, backgroundColor: p.color }}
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/25">{p.n}</span>
            <span className="truncate capitalize">{p.label}</span>
          </span>
        ) : null
      )}
    </div>
  )
}
