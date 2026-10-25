import { CheckCircle2, Clock, MapPin, Truck } from "lucide-react"
import { BeforeAfter } from "@/dumps/BeforeAfter"
import type { DumpReport } from "@/dumps/types"
import { relativeTime } from "@/lib/dates"
import { formatKg } from "@/lib/impact"

const cleanedAt = (d: DumpReport) => d.sweeperCrew?.cleanedAt ?? d.updatedAt

/** Cleanup at a glance (open, crews working, cleared in the last 7 days, kg recovered) plus the latest before/afters. */
export function CleanupSummary({ dumps, onOpenQueue }: { dumps: DumpReport[]; onOpenQueue: () => void }) {
  const open = dumps.filter((d) => d.status === "reported" || d.status === "dispatched_to_government").length
  const working = dumps.filter((d) => d.status === "in_progress" || d.status === "assigned_sweeper").length
  const cleaned = dumps.filter((d) => d.status === "cleaned").sort((a, b) => cleanedAt(b).localeCompare(cleanedAt(a)))
  // rolling 7 days, so the number doesn't drop to 0 every Monday
  const weekAgo = Date.now() - 7 * 86400000
  const lastWeek = cleaned.filter((d) => new Date(cleanedAt(d)).getTime() >= weekAgo).length
  const kg = cleaned.reduce((n, d) => n + (d.sweeperCrew?.recycledKg ?? d.estimatedWeightKg), 0)

  return (
    <section className="space-y-3" aria-label="Cleanup progress">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<MapPin size={16} />} value={open} label="Waiting for a crew" tone="chip-alert" />
        <Stat icon={<Truck size={16} />} value={working} label="Crews working" />
        <Stat icon={<CheckCircle2 size={16} />} value={lastWeek} label="Cleaned in 7 days" />
        <Stat icon={<Clock size={16} />} value={formatKg(kg)} label="Recovered so far" />
      </div>

      {cleaned.length > 0 && (
        <div className="glass p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="display text-lg">Recently cleaned</h2>
            <button onClick={onOpenQueue} className="ww-press text-sm font-semibold text-green hover:underline">
              Cleanup queue
            </button>
          </div>
          <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {cleaned.slice(0, 6).map((d) => (
              <article key={d.id} className="tile w-[260px] shrink-0 snap-start overflow-hidden">
                <BeforeAfter before={d.imageUrl} after={d.afterImageUrl} alt={d.title} className="h-36" />
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold">{d.title}</h3>
                  <p className="mt-0.5 text-xs text-sub">
                    {formatKg(d.sweeperCrew?.recycledKg ?? d.estimatedWeightKg)} cleared · {relativeTime(cleanedAt(d))}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone?: string }) {
  return (
    <div className="glass flex items-center gap-3 px-4 py-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone ?? "bg-mint text-green"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="display block text-xl leading-tight tabular-nums">{value}</span>
        <span className="block truncate text-xs text-sub">{label}</span>
      </span>
    </div>
  )
}
