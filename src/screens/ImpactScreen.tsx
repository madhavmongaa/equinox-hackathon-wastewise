// Your impact: what sorting right adds up to (estimates from scan history), plus the
// campus total from cleaned dumps.

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Info, Leaf, Recycle, ScanLine, Share2, Trees, Truck } from "lucide-react"
import { shareCard } from "@/lib/shareCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CountUp } from "@/components/motion"
import type { DumpReport } from "@/dumps/types"
import { binTone } from "@/lib/binColors"
import { guide } from "@/lib/guide"
import { DUMP_CO2_PER_KG, IMPACT_FACTORS, formatKg, impactOf, treeText } from "@/lib/impact"
import { useApp } from "@/state/AppContext"

const label = (id: string) => guide.categories.find((c) => c.id === id)?.label ?? "Not in the guide"

export function ImpactScreen() {
  const { navigate, history, toast } = useApp()
  const me = useMemo(() => impactOf(history), [history])
  const share = async () => {
    try {
      const how = await shareCard({ kind: "impact", co2: formatKg(me.co2Kg), landfill: formatKg(me.kgDiverted), items: me.items, trees: treeText(me.treeDays) })
      if (how === "downloaded") toast("Image saved. Share it from your downloads 📸", "info")
    } catch {
      toast("Couldn't make the image right now.", "error")
    }
  }
  const campus = useCampusCleanup()
  const maxWeek = Math.max(0.001, ...me.weeks.map((w) => w.co2Kg))
  const thisWeek = me.weeks[me.weeks.length - 1]

  return (
    <div className="space-y-4 px-4 pt-4 pb-32 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0 lg:pt-8 lg:pb-16">
      <header className="flex items-center gap-3 lg:col-span-12">
        <Button variant="secondary" size="icon" aria-label="Back to Home" onClick={() => navigate({ name: "home" })}>
          <ArrowLeft size={22} />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Your impact</p>
          <h1 className="display text-3xl lg:text-[40px]">What sorting adds up to</h1>
        </div>
        {me.items > 0 && (
          <Button variant="secondary" size="sm" className="shrink-0" onClick={share}>
            <Share2 size={16} /> Share
          </Button>
        )}
      </header>

      {/* headline numbers */}
      <section className="pill relative overflow-hidden rounded-[24px] p-6 lg:col-span-12 lg:p-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <BigStat icon={<Leaf size={18} />} value={<CountUp value={me.co2Kg} format={formatKg} duration={1200} />} unit="CO₂e saved" />
          <BigStat icon={<Recycle size={18} />} value={<CountUp value={me.kgDiverted} format={formatKg} duration={1200} />} unit="kept out of landfill" />
          <BigStat icon={<Trees size={18} />} value={me.items ? treeText(me.treeDays) : "—"} unit="the same as" small />
        </div>
        <p className="mt-5 text-sm text-white/75">
          From {me.items} sorted {me.items === 1 ? "item" : "items"}
          {thisWeek.items > 0 && ` · ${thisWeek.items} this week`}
        </p>
      </section>

      {me.items === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center lg:col-span-12">
          <p className="text-sm text-sub">Scan your first item to start counting your impact 🌱</p>
          <Button onClick={() => navigate({ name: "scan" })}>
            <ScanLine size={18} /> Scan an item
          </Button>
        </Card>
      ) : (
        <>
          {/* weekly trend */}
          <Card className="lg:col-span-7">
            <h2 className="display text-lg">Last 8 weeks</h2>
            <p className="mb-4 text-sm text-sub">CO₂e saved each week</p>
            <div className="flex h-40 items-end gap-2" role="img" aria-label="Bar chart of CO2 saved over the last 8 weeks">
              {me.weeks.map((w, i) => (
                <div key={w.weekId} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  {w.co2Kg > 0 && <span className="text-[10px] font-semibold text-sub tabular-nums">{formatKg(w.co2Kg)}</span>}
                  <div
                    className={i === me.weeks.length - 1 ? "ww-grow-y w-full rounded-t-[8px] bg-green" : "ww-grow-y w-full rounded-t-[8px] bg-mint"}
                    style={{ height: `${Math.max(w.co2Kg ? 6 : 2, (w.co2Kg / maxWeek) * 100)}%`, animationDelay: `${i * 60}ms` }}
                    title={`${w.weekId}: ${w.items} items`}
                  />
                  <span className="truncate text-[10px] text-sub">{w.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* by bin */}
          <Card className="lg:col-span-5">
            <h2 className="display text-lg">By bin</h2>
            <p className="mb-4 text-sm text-sub">Where your savings come from</p>
            <ul className="space-y-3">
              {me.byCategory.map((c) => {
                const tone = binTone(c.id === "none" ? null : c.id)
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold">{label(c.id)}</span>
                      <span className="text-xs text-sub tabular-nums">
                        {c.items} × · {formatKg(c.co2Kg)} CO₂e
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: tone.soft }}>
                      <div className="ww-grow-x h-full rounded-full" style={{ width: `${(c.co2Kg / Math.max(0.001, me.co2Kg)) * 100}%`, background: tone.vivid }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}

      {/* campus */}
      <Card className="lg:col-span-7">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-green" />
          <h2 className="display text-lg">Campus cleanup</h2>
        </div>
        <p className="mb-4 text-sm text-sub">Illegal dumps reported by students and cleared by crews</p>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat value={campus ? <CountUp value={campus.cleaned} /> : "…"} label="dumps cleared" />
          <MiniStat value={campus ? <CountUp value={campus.kg} format={formatKg} /> : "…"} label="waste recovered" />
          <MiniStat value={campus ? <CountUp value={campus.kg * DUMP_CO2_PER_KG} format={formatKg} /> : "…"} label="CO₂e saved" />
        </div>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate({ name: "dumps" })}>
          See the dumps map
        </Button>
      </Card>

      {/* method */}
      <Card className="lg:col-span-5">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-green" />
          <h2 className="display text-lg">How we estimate</h2>
        </div>
        <p className="mt-2 text-sm text-sub">
          Each sorted item counts an average weight for its bin, times the emissions saved compared with landfill. They're rough averages, good for trends
          rather than exact numbers.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-sub">
          {Object.entries(IMPACT_FACTORS)
            .filter(([, f]) => f.co2PerKg > 0)
            .map(([id, f]) => (
              <li key={id} className="flex justify-between gap-2">
                <span>{label(id)}</span>
                <span className="tabular-nums">
                  ~{formatKg(f.kg)} per item · {f.co2PerKg} kg CO₂e/kg
                </span>
              </li>
            ))}
          <li className="flex justify-between gap-2">
            <span>A grown tree</span>
            <span>~21 kg CO₂ a year</span>
          </li>
        </ul>
      </Card>
    </div>
  )
}

function BigStat({ icon, value, unit, small }: { icon: React.ReactNode; value: React.ReactNode; unit: string; small?: boolean }) {
  return (
    <div>
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-mint">{icon}</div>
      {small && <div className="text-xs text-white/70">{unit}</div>}
      <div className={small ? "font-display text-xl leading-tight font-bold" : "font-display text-4xl leading-none font-bold tracking-tight lg:text-5xl"}>
        {value}
      </div>
      {!small && <div className="mt-1 text-sm text-white/75">{unit}</div>}
    </div>
  )
}

function MiniStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="tile px-3 py-3 text-center">
      <div className="display text-xl leading-tight">{value}</div>
      <div className="text-[11px] leading-tight text-sub">{label}</div>
    </div>
  )
}

/** Cleared dumps (all time) and how much waste crews recovered from them. */
export function useCampusCleanup() {
  const [data, setData] = useState<{ cleaned: number; kg: number } | null>(null)
  useEffect(() => {
    let alive = true
    fetch("/api/dumps")
      .then((r) => r.json())
      .then((d) => {
        const cleaned = ((d.dumps as DumpReport[] | undefined) ?? []).filter((x) => x.status === "cleaned")
        if (alive)
          setData({
            cleaned: cleaned.length,
            kg: cleaned.reduce((n, x) => n + (x.sweeperCrew?.recycledKg ?? x.estimatedWeightKg), 0),
          })
      })
      .catch(() => alive && setData({ cleaned: 0, kg: 0 }))
    return () => {
      alive = false
    }
  }, [])
  return data
}
