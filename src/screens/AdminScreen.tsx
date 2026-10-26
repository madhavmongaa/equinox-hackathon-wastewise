// Campus dashboard for staff: illegal-dump reports (status, severity, area, how fast
// they're cleared) and who's taking part this week, by team. Scan history stays on each
// phone, so it isn't counted here.

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, Clock, MapPin, Truck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CountUp, Skeleton } from "@/components/motion"
import { SEVERITY_COLOR, SEVERITY_ORDER } from "@/dumps/severity"
import type { DumpReport, DumpStatus } from "@/dumps/types"
import { useTeamBoard } from "@/hooks/useLeaderboard"
import { relativeTime } from "@/lib/dates"
import { formatKg } from "@/lib/impact"
import { TEAMS, teamById } from "@/lib/teams"
import { useApp } from "@/state/AppContext"

const STATUS_LABEL: Record<DumpStatus, string> = {
  reported: "Reported",
  dispatched_to_government: "Sent to council",
  assigned_sweeper: "Crew assigned",
  in_progress: "Crew working",
  cleaned: "Cleaned",
}

/** The first part of an address ("Sohna Sabzi Mandi service lane, …" → "Sohna Sabzi Mandi service lane"). */
const area = (d: DumpReport) => (d.location.address ?? "Unknown area").split(",")[0].trim()

export function AdminScreen() {
  const { navigate } = useApp()
  const [dumps, setDumps] = useState<DumpReport[] | null>(null)
  const teams = useTeamBoard()

  useEffect(() => {
    fetch("/api/dumps")
      .then((r) => r.json())
      .then((d) => setDumps((d.dumps as DumpReport[]) ?? []))
      .catch(() => setDumps([]))
  }, [])

  const stats = useMemo(() => {
    if (!dumps) return null
    const open = dumps.filter((d) => d.status !== "cleaned")
    const cleaned = dumps.filter((d) => d.status === "cleaned")
    const hours = cleaned
      .map((d) => (new Date(d.sweeperCrew?.cleanedAt ?? d.updatedAt).getTime() - new Date(d.createdAt).getTime()) / 3600000)
      .filter((h) => h > 0)
    const byStatus = (Object.keys(STATUS_LABEL) as DumpStatus[]).map((s) => ({ s, n: dumps.filter((d) => d.status === s).length }))
    const bySeverity = SEVERITY_ORDER.map((s) => ({ s, n: open.filter((d) => d.severity === s).length }))
    const areas: Record<string, { n: number; kg: number }> = {}
    open.forEach((d) => {
      const a = (areas[area(d)] ??= { n: 0, kg: 0 })
      a.n++
      a.kg += d.estimatedWeightKg
    })
    const oldest = [...open].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
    return {
      open,
      openKg: open.reduce((n, d) => n + d.estimatedWeightKg, 0),
      clearedKg: cleaned.reduce((n, d) => n + (d.sweeperCrew?.recycledKg ?? d.estimatedWeightKg), 0),
      avgHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
      byStatus,
      bySeverity,
      areas: Object.entries(areas)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.kg - a.kg)
        .slice(0, 5),
      oldest,
      critical: open.filter((d) => d.severity === "critical"),
    }
  }, [dumps])

  const maxStatus = Math.max(1, ...(stats?.byStatus.map((x) => x.n) ?? [1]))
  const maxArea = Math.max(1, ...(stats?.areas.map((x) => x.kg) ?? [1]))
  const teamRows = TEAMS.map((t) => teams.rows.find((r) => r.team === t.id) ?? { team: t.id, points: 0, members: 0 }).sort((a, b) => b.points - a.points)
  const sorters = teams.rows.reduce((n, r) => n + r.members, 0)

  return (
    <div className="space-y-4 px-4 pt-4 pb-32 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0 lg:pt-8 lg:pb-16">
      <header className="flex items-center gap-3 lg:col-span-12">
        <Button variant="secondary" size="icon" aria-label="Back to Profile" onClick={() => navigate({ name: "profile" })}>
          <ArrowLeft size={22} />
        </Button>
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">For campus staff</p>
          <h1 className="display text-3xl lg:text-[40px]">Campus dashboard</h1>
        </div>
      </header>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-12 lg:gap-4">
        <Kpi icon={<MapPin size={16} />} label="Open dump reports" value={stats ? <CountUp value={stats.open.length} /> : null} />
        <Kpi icon={<AlertTriangle size={16} />} label="Waste still on the ground" value={stats ? <CountUp value={stats.openKg} format={formatKg} /> : null} />
        <Kpi
          icon={<Clock size={16} />}
          label="Average time to clean"
          value={stats ? (stats.avgHours === null ? "—" : `${Math.round(stats.avgHours)} h`) : null}
        />
        <Kpi icon={<Users size={16} />} label="Sorters this week" value={teams.connected ? <CountUp value={sorters} /> : "—"} />
      </div>

      {/* reports by status */}
      <Card className="lg:col-span-6">
        <h2 className="display text-lg">Reports by status</h2>
        <p className="mb-4 text-sm text-sub">{stats ? `${formatKg(stats.clearedKg)} cleared so far` : "Loading…"}</p>
        {!stats ? (
          <Skeleton className="h-40" />
        ) : (
          <ul className="space-y-3">
            {stats.byStatus.map(({ s, n }, i) => (
              <li key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{STATUS_LABEL[s]}</span>
                  <span className="text-sub tabular-nums">{n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-mint">
                  <div
                    className="ww-grow-x h-full rounded-full"
                    style={{
                      width: `${(n / maxStatus) * 100}%`,
                      background: s === "cleaned" ? "var(--color-success)" : "var(--color-green)",
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* open reports by area and severity */}
      <Card className="lg:col-span-6">
        <h2 className="display text-lg">Hotspots</h2>
        <p className="mb-4 text-sm text-sub">Open reports by area, heaviest first</p>
        {!stats ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <ul className="space-y-3">
              {stats.areas.map((a, i) => (
                <li key={a.name}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{a.name}</span>
                    <span className="shrink-0 text-sub tabular-nums">
                      {a.n} · {formatKg(a.kg)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-mint">
                    <div
                      className="ww-grow-x h-full rounded-full bg-[#FF8A00]"
                      style={{ width: `${(a.kg / maxArea) * 100}%`, animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.bySeverity.map(({ s, n }) => (
                <span key={s} className="tile inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold capitalize">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLOR[s] }} /> {s}: {n}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* needs attention */}
      <Card className="lg:col-span-6">
        <div className="mb-3 flex items-center gap-2">
          <Truck size={18} className="text-green" />
          <h2 className="display text-lg">Needs attention</h2>
        </div>
        {!stats ? (
          <Skeleton className="h-24" />
        ) : stats.critical.length === 0 && !stats.oldest ? (
          <p className="tile px-4 py-4 text-sm text-sub">Nothing open. Every report has been cleaned 🎉</p>
        ) : (
          <ul className="space-y-2">
            {[...stats.critical, ...(stats.oldest && !stats.critical.includes(stats.oldest) ? [stats.oldest] : [])].slice(0, 4).map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => navigate({ name: "dumps", dumpId: d.id })}
                  className="ww-press tile flex w-full items-center gap-3 px-3.5 py-3 text-left"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[d.severity] }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{d.title}</span>
                    <span className="block text-xs text-sub">
                      {STATUS_LABEL[d.status]} · reported {relativeTime(d.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold capitalize">{d.severity}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* participation */}
      <Card className="lg:col-span-6">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-green" />
          <h2 className="display text-lg">Participation this week</h2>
        </div>
        {!teams.connected ? (
          <p className="tile px-4 py-4 text-sm text-sub">Needs the campus leaderboard (Firebase) to be connected.</p>
        ) : teams.loading ? (
          <Skeleton className="h-40" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-sub">
                <th className="pb-2 font-semibold">Team</th>
                <th className="pb-2 text-right font-semibold">Sorters</th>
                <th className="pb-2 text-right font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((r) => {
                const t = teamById(r.team)!
                return (
                  <tr key={r.team} className="border-t border-[var(--ww-line)]">
                    <td className="py-2">
                      {t.emoji} {t.name}
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.members}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{r.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11px] text-sub">Scan history stays on each student's phone, so it isn't included here.</p>
      </Card>
    </div>
  )
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode | null }) {
  return (
    <div className="glass px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-green">{icon}</span>
      <div className="display mt-2 text-2xl leading-tight">{value ?? <Skeleton className="h-7 w-16" />}</div>
      <div className="text-xs text-sub">{label}</div>
    </div>
  )
}
