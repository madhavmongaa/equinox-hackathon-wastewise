import { useRef } from "react"
import { ChevronRight, Flame, Package, Sparkles, Trophy } from "lucide-react"
import { Card, Mark } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CountUp, SkeletonRows, useFlip } from "@/components/motion"
import { CategoryChip, LevelBadge, Thumb } from "@/components/brand"
import { useLeaderboard, useMyRank } from "@/hooks/useLeaderboard"
import { useStats } from "@/hooks/useStats"
import { relativeTime } from "@/lib/dates"
import type { BoardRow } from "@/lib/leaderboard"
import type { HistoryEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"
import { t, useLang } from "@/lib/i18n"

// ---------- tracking ----------

export function StatTile({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="tile px-3 py-3 text-center">
      <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full bg-mint text-green">{icon}</div>
      <div className="display text-2xl leading-tight">{typeof value === "number" ? <CountUp value={value} /> : value}</div>
      <div className="text-[11px] leading-tight text-sub">{label}</div>
    </div>
  )
}

export function LevelProgress({ compact }: { compact?: boolean }) {
  const s = useStats()
  return (
    <div className={compact ? "" : "mt-4"}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">
          {s.level.level.badge} {s.level.level.name}
        </span>
        <span className="text-sub">{s.nextText}</span>
      </div>
      <Progress value={s.level.progress} label="Progress to next level" />
    </div>
  )
}

export function EcoTrackingCard({ index, className }: { index?: number; className?: string }) {
  const s = useStats()
  return (
    <Card index={index} className={className}>
      <h2 className="display mb-3 text-lg">Your Eco Tracking</h2>
      {!s.hasActivity ? (
        <p className="tile px-4 py-5 text-center text-sm text-sub">Scan your first item to start tracking 🌱</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile icon={<Sparkles size={16} />} value={s.itemsToday} label="Items today" />
            <StatTile icon={<Flame size={16} />} value={s.streak} label={s.streak === 1 ? "Day streak" : "Days streak"} />
            <StatTile icon={<Package size={16} />} value={s.totalSorted} label="Total sorted" />
          </div>
          <LevelProgress />
        </>
      )}
    </Card>
  )
}

// ---------- leaderboard ----------

export function Avatar({ emoji, size = 40, ring }: { emoji: string; size?: number; ring?: string }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-mint"
      style={{ width: size, height: size, fontSize: size * 0.5, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}
      aria-hidden="true"
    >
      {emoji || "🌱"}
    </span>
  )
}

export function NotConnectedNote() {
  return (
    <p className="glass rounded-[16px] px-4 py-4 text-center text-sm text-ink">
      The campus leaderboard isn't connected yet. Add the Firebase settings to <code className="text-xs">.env.local</code> to turn it on.
    </p>
  )
}

export function BoardList({ rows, highlightUid, startRank = 1 }: { rows: BoardRow[]; highlightUid?: string | null; startRank?: number }) {
  // rows slide to their new place when ranks change live
  const list = useRef<HTMLOListElement>(null)
  useFlip(list, rows.map((r) => r.uid).join())
  return (
    <ol ref={list} className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={r.uid}
          data-flip-key={r.uid}
          className={cn(
            "ww-fade-up flex items-center gap-3 rounded-[16px] px-3 py-2.5",
            r.uid === highlightUid ? "pill rounded-[16px]" : "tile text-ink"
          )}
          style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
        >
          <span className={cn("w-7 text-center text-sm font-bold", r.uid === highlightUid ? "text-white/75" : "text-sub")}>#{startRank + i}</span>
          <Avatar emoji={r.avatar} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {r.displayName}
              {r.uid === highlightUid && " (You)"}
            </span>
            <LevelBadge points={r.points} className={r.uid === highlightUid ? "bg-mint" : ""} />
          </span>
          <span className="text-sm font-bold">{r.value} pts</span>
        </li>
      ))}
    </ol>
  )
}

export function YouRankLine({ rank, points, className }: { rank: number | null; points: number; className?: string }) {
  return (
    <div className={cn("pill flex items-center justify-between px-5 py-3 text-sm", className)}>
      <span className="font-semibold">{rank ? `#${rank}` : "—"} · You</span>
      <span className="font-bold">{points} pts</span>
    </div>
  )
}

export function LeaderboardPreviewCard({ index, className }: { index?: number; className?: string }) {
  const { navigate, uid, profile } = useApp()
  const lang = useLang()
  const { rows, loading, error, connected } = useLeaderboard("week", 3)
  const rank = useMyRank("week", rows)
  const s = useStats()
  return (
    <Card index={index} className={className}>
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={18} className="text-green" />
        <h2 className="display text-lg">{t("This week's top sorters", lang)}</h2>
      </div>
      {!connected ? (
        <NotConnectedNote />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : error ? (
        <p className="py-4 text-center text-sm text-sub">{error}</p>
      ) : rows.length === 0 ? (
        <p className="tile px-4 py-4 text-center text-sm text-sub">No one has scored yet this week. Be the first! 🚀</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {rows.map((r, i) => (
            <div key={r.uid} className={cn("rounded-[16px] px-2 py-3 text-center", r.uid === uid ? "bg-mint" : "tile")}>
              <div className="text-xs font-bold text-sub">#{i + 1}</div>
              <div className="mx-auto my-1 w-fit">
                <Avatar emoji={r.avatar} size={40} ring={["#E9B949", "#C0C6CC", "#C98A5B"][i]} />
              </div>
              <div className="truncate text-sm font-semibold">{r.displayName}</div>
              <div className="text-xs text-sub">{r.value} pts</div>
            </div>
          ))}
        </div>
      )}
      {connected && profile && <YouRankLine rank={rank} points={s.weeklyPoints} className="mt-3" />}
      <button onClick={() => navigate({ name: "leaderboard" })} className="ww-press pill mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-sm">
        See full leaderboard <ChevronRight size={16} />
      </button>
    </Card>
  )
}

// ---------- history ----------

export function HistoryRow({ entry, onClick, showTime = "relative" }: { entry: HistoryEntry; onClick?: () => void; showTime?: "relative" | "clock" }) {
  const time = showTime === "relative" ? relativeTime(entry.timestamp) : new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return (
    <button onClick={onClick} className="ww-press glass lift flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left">
      <Thumb src={entry.thumbnail} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold capitalize">{entry.corrected_item ?? entry.ai_item}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <CategoryChip categoryId={entry.category_id} />
          {entry.corrected_item && <Mark className="text-[11px]">Corrected</Mark>}
        </span>
      </span>
      <span className="shrink-0 text-xs text-sub">{time}</span>
    </button>
  )
}
