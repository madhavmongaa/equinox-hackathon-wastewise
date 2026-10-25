import { useMemo } from "react"
import { ChevronRight, Flame, Leaf, Package, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LevelProgress, StatTile } from "@/components/widgets"
import { useStats } from "@/hooks/useStats"
import { formatKg, impactOf, treeText } from "@/lib/impact"
import { useApp } from "@/state/AppContext"

/** Home: today's numbers, level and a one-line impact summary linking to the Impact page. */
export function ImpactCard({ index, className }: { index?: number; className?: string }) {
  const { navigate, history } = useApp()
  const s = useStats()
  const impact = useMemo(() => impactOf(history), [history])
  return (
    <Card index={index} className={className}>
      <h2 className="display mb-3 text-lg">Your progress</h2>
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={<Sparkles size={16} />} value={s.itemsToday} label="Items today" />
        <StatTile icon={<Flame size={16} />} value={s.streak} label={s.streak === 1 ? "Day streak" : "Days streak"} />
        <StatTile icon={<Package size={16} />} value={s.totalSorted} label="Total sorted" />
      </div>
      <LevelProgress />
      <button
        onClick={() => navigate({ name: "impact" })}
        className="ww-press tile mt-4 flex w-full items-center gap-3 px-3.5 py-3 text-left hover:border-[var(--ww-line-strong)]"
      >
        <span className="pill grid h-9 w-9 shrink-0 place-items-center rounded-full">
          <Leaf size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{impact.items ? `${formatKg(impact.co2Kg)} CO₂e saved` : "See your impact"}</span>
          <span className="block truncate text-xs text-sub">
            {impact.items ? `About ${treeText(impact.treeDays)}` : "CO₂ and landfill savings from sorting"}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-sub" />
      </button>
    </Card>
  )
}
