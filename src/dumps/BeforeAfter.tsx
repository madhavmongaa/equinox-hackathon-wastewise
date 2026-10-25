import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { DumpPhoto } from "@/dumps/DumpPhoto"
import type { DumpStatus } from "@/dumps/types"
import { cn } from "@/lib/utils"

/**
 * Before/after photo of a cleaned dump with a drag handle. Without an after photo it
 * shows the before photo with a "Cleared" stamp instead.
 */
export function BeforeAfter({ before, after, alt, className }: { before: string; after?: string; alt: string; className?: string }) {
  const [pos, setPos] = useState(50)
  if (!after) {
    return (
      <div className={cn("relative overflow-hidden bg-mint", className)}>
        <DumpPhoto src={before} alt={`${alt}, before cleanup`} className="h-full w-full object-cover grayscale-[35%]" />
        <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">Before</span>
        <span className="absolute inset-0 grid place-items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-1.5 text-xs font-bold text-white shadow-lift">
            <CheckCircle2 size={14} /> Cleared
          </span>
        </span>
      </div>
    )
  }
  return (
    <div className={cn("relative overflow-hidden bg-mint select-none", className)}>
      <DumpPhoto src={after} alt={`${alt}, after cleanup`} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <DumpPhoto src={before} alt={`${alt}, before cleanup`} className="h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[11px] font-bold text-green shadow-lift">
          ⇆
        </span>
      </div>
      <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">Before</span>
      <span className="absolute top-2 right-2 rounded-full bg-green px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Slide to compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}

const STEPS = ["Reported", "Crew on it", "Cleaned"] as const

export function stepIndex(status: DumpStatus) {
  if (status === "cleaned") return 2
  if (status === "in_progress" || status === "assigned_sweeper") return 1
  return 0
}

/** Reported → Crew on it → Cleaned */
export function StatusSteps({ status, className }: { status: DumpStatus; className?: string }) {
  const at = stepIndex(status)
  return (
    <ol className={cn("flex items-center gap-1.5", className)} aria-label={`Cleanup status: ${STEPS[at]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("h-1.5 rounded-full", i <= at ? (at === 2 ? "bg-success" : "bg-green") : "bg-mint")} />
          <span className={cn("truncate text-[10px] font-semibold", i === at ? "text-ink" : "text-sub")}>{s}</span>
        </li>
      ))}
    </ol>
  )
}
