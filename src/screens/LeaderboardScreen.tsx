import { useRef, useState } from "react"
import { ArrowLeft, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Mark } from "@/components/ui/card"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { LevelBadge } from "@/components/brand"
import { SkeletonRows, useFlip } from "@/components/motion"
import { TeamPicker } from "@/components/team-picker"
import { Avatar, BoardList, NotConnectedNote, YouRankLine } from "@/components/widgets"
import { useLeaderboard, useMyRank, useTeamBoard } from "@/hooks/useLeaderboard"
import { TEAMS, teamById } from "@/lib/teams"
import { useStats } from "@/hooks/useStats"
import type { BoardRow, BoardTab } from "@/lib/leaderboard"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

const RINGS = ["#E9B949", "#C0C6CC", "#C98A5B"]

export function LeaderboardScreen() {
  const { navigate, uid, profile } = useApp()
  const [tab, setTab] = useState<BoardTab | "teams">("week")
  const { rows, loading, error, connected } = useLeaderboard(tab === "teams" ? "week" : tab, 50)
  const rank = useMyRank(tab === "teams" ? "week" : tab, rows)
  const s = useStats()
  const podium = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="px-4 pt-4 pb-44 lg:mx-auto lg:max-w-[860px] lg:pt-8 lg:pb-28">
      <header className="mb-4 flex items-center gap-2">
        <Button variant="secondary" size="icon" aria-label="Back to Home" onClick={() => navigate({ name: "home" })}>
          <ArrowLeft size={22} />
        </Button>
      </header>
      <div className="ww-fade-up mb-5 flex items-center gap-3">
        <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1">
          <LuluMascot mood="happy" size={56} />
        </span>
        <div>
          <h1 className="display text-[34px] leading-tight">Eco Leaderboard</h1>
          <Mark className="mt-1 text-sm">Sort right, climb higher 🌱</Mark>
        </div>
      </div>

      <div className="pill-glass mb-5 grid grid-cols-3 p-1" role="tablist">
        {(["week", "all", "teams"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("h-11 rounded-full text-sm font-semibold transition-colors", tab === t ? "bg-mint text-green shadow-soft" : "text-sub")}
          >
            {t === "week" ? "This Week" : t === "all" ? "All Time" : "Areas"}
          </button>
        ))}
      </div>

      {tab === "teams" ? (
        <TeamBoard />
      ) : !connected ? (
        <NotConnectedNote />
      ) : loading ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <p className="glass px-5 py-6 text-center text-sm">{error}</p>
      ) : rows.length === 0 ? (
        <div className="ww-fade-up flex flex-col items-center glass px-6 py-10 text-center">
          <p className="text-sm text-sub">{tab === "week" ? "No one has scored yet this week. Be the first! 🚀" : "No one has scored yet. Be the first! 🚀"}</p>
          <Button className="mt-4" onClick={() => navigate({ name: "scan" })}>
            <ScanLine size={18} /> Scan an item
          </Button>
        </div>
      ) : (
        <>
          <Podium rows={podium} uid={uid} />
          {rest.length > 0 && (
            <div className="mt-5">
              <BoardList rows={rest} startRank={4} highlightUid={uid} />
            </div>
          )}
        </>
      )}

      {connected && profile && tab !== "teams" && (
        <div className="fixed inset-x-0 bottom-[84px] z-30 mx-auto w-full max-w-[480px] px-4 md:max-w-[720px] lg:bottom-6 lg:max-w-[860px]">
          <YouRankLine rank={rank} points={tab === "week" ? s.weeklyPoints : s.points} className="shadow-lift" />
        </div>
      )}
    </div>
  )
}

function Podium({ rows, uid }: { rows: BoardRow[]; uid: string | null }) {
  // 2nd · 1st · 3rd, with 1st centred and taller
  const order = [rows[1], rows[0], rows[2]]
  const heights = ["h-24", "h-32", "h-20"]
  const places = [2, 1, 3]
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((r, i) =>
        r ? (
          <div key={r.uid} className="ww-pop flex flex-col items-center text-center" style={{ animationDelay: `${i * 60}ms` }}>
            <Avatar emoji={r.avatar} size={places[i] === 1 ? 60 : 48} ring={RINGS[places[i] - 1]} />
            <span className={cn("on-sky mt-2 w-full truncate text-sm font-semibold", r.uid === uid && "text-green")}>
              {r.displayName}
              {r.uid === uid && " (You)"}
            </span>
            <LevelBadge points={r.points} className="mt-1" />
            <span className="on-sky mt-1 text-xs font-bold">{r.value} pts</span>
            <div className={cn("mt-2 flex w-full items-start justify-center rounded-t-[16px] border-[3px] border-b-0 border-white pt-2 font-display text-3xl text-white", heights[i])} style={{ background: RINGS[places[i] - 1] }}>
              {places[i]}
            </div>
          </div>
        ) : (
          <div key={i} />
        )
      )}
    </div>
  )
}

/** This week's teams, biggest total first, plus your own team (or a picker if you have none). */
function TeamBoard() {
  const { profile } = useApp()
  const { rows, loading, error, connected } = useTeamBoard()
  const mine = teamById(profile?.team)
  const max = Math.max(1, ...rows.map((r) => r.points))
  // teams with nobody scoring yet still show, at the bottom
  const all = [...rows, ...TEAMS.filter((t) => !rows.some((r) => r.team === t.id)).map((t) => ({ team: t.id, points: 0, members: 0 }))]
  const list = useRef<HTMLOListElement>(null)
  useFlip(list, all.map((r) => r.team).join())

  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <p className="text-sm font-semibold">{mine ? `You're sorting for ${mine.emoji} ${mine.name}` : "Pick your area to add your points to it"}</p>
        <p className="mb-3 text-xs text-sub">Every point you earn this week counts for your area too.</p>
        <TeamPicker />
      </div>
      {!connected ? (
        <NotConnectedNote />
      ) : loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <p className="glass px-5 py-6 text-center text-sm">{error}</p>
      ) : (
        <ol ref={list} className="space-y-2">
          {all.map((r, i) => {
            const t = teamById(r.team)
            if (!t) return null
            return (
              <li key={r.team} data-flip-key={r.team} className={cn("ww-fade-up glass flex items-center gap-3 px-4 py-3", mine?.id === r.team && "ring-2 ring-green")} style={{ animationDelay: `${i * 40}ms` }}>
                <span className="w-6 text-center text-sm font-bold text-sub">#{i + 1}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl" style={{ background: `${t.color}22` }} aria-hidden="true">
                  {t.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{t.name}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{r.points} pts</span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-mint">
                    <span
                      className="ww-grow-x block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${(r.points / max) * 100}%`, background: t.color, animationDelay: `${i * 80}ms` }}
                    />
                  </span>
                  <span className="mt-1 block text-[11px] text-sub">
                    {r.members} {r.members === 1 ? "sorter" : "sorters"} this week
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
