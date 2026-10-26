// Reusable motion pieces: numbers that count up, shimmer placeholders while loading,
// and list rows that slide to their new places when the order changes.

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { cn, prefersReducedMotion } from "@/lib/utils"

/** Counts up from the previous value (0 at first) to `value`, then stays put. */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 900,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
}) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  const from = useRef(shown)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value)
      from.current = value
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      const n = a + (value - a) * eased
      setShown(n)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value, duration])
  return <span className="tabular-nums">{format(shown)}</span>
}

/** Grey shimmering block in the shape of content that's still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("ww-skeleton block rounded-[12px]", className)} />
}

/** Placeholder rows for a list that's loading. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="tile flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <span className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </span>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

/**
 * FLIP: children with a data-flip-key slide from where they were to where they are
 * now whenever `deps` change (e.g. leaderboard rows changing rank).
 */
export function useFlip(container: RefObject<HTMLElement | null>, deps: unknown) {
  const last = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const el = container.current
    if (!el) return
    const items = [...el.querySelectorAll<HTMLElement>("[data-flip-key]")]
    const next = new Map<string, number>()
    for (const item of items) {
      const key = item.dataset.flipKey!
      const top = item.getBoundingClientRect().top
      next.set(key, top)
      const before = last.current.get(key)
      if (before !== undefined && before !== top && !prefersReducedMotion()) {
        item.animate([{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" })
      }
    }
    last.current = next
  }, [container, deps])
}

/** True once the element has scrolled into view (for one-off entrance animations). */
export function useInView<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (!("IntersectionObserver" in window)) return setSeen(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen]
}
