import { useMemo, useState } from "react"
import { Check, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useActivity } from "@/lib/activity"
import { loadClaimed, saveClaimed, weekEndsIn, weekProgress, type ChallengeProgress } from "@/lib/challenges"
import { istWeekId } from "@/lib/dates"
import { POINTS } from "@/lib/points"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

/** This week's four challenges, with progress and a claim button when one is done. */
export function ChallengesCard({ index, className }: { index?: number; className?: string }) {
  const { history, uid, profile, openJoin, awardBonus } = useApp()
  const activity = useActivity()
  const weekId = istWeekId()
  const [claimed, setClaimed] = useState(() => loadClaimed(uid, weekId))
  const [claiming, setClaiming] = useState<string | null>(null)
  // claims belong to the signed-in account
  const [claimsFor, setClaimsFor] = useState(uid)
  if (claimsFor !== uid) {
    setClaimsFor(uid)
    setClaimed(loadClaimed(uid, weekId))
  }

  const list = useMemo(() => weekProgress(history, activity, claimed, weekId), [history, activity, claimed, weekId])
  const finished = list.filter((c) => c.done).length

  const claim = async (c: ChallengeProgress) => {
    if (!profile) return openJoin()
    setClaiming(c.id)
    const ok = await awardBonus({ amount: POINTS.challenge, stats: { challengesCompleted: 1 } }, c.title)
    if (ok) {
      const next = [...claimed, c.id]
      saveClaimed(uid, next, weekId)
      setClaimed(next)
    }
    setClaiming(null)
  }

  return (
    <Card index={index} className={className}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-green" />
          <h2 className="display text-lg">Weekly challenges</h2>
        </div>
        <span className="badge-mint text-xs">{weekEndsIn()}</span>
      </div>
      <p className="mb-4 text-sm text-sub">
        {finished} of {list.length} done · +{POINTS.challenge} points each
      </p>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.map((c) => (
          <li key={c.id} className={cn("tile flex items-center gap-3 px-3.5 py-3", c.claimed && "opacity-70")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-xl shadow-soft" aria-hidden="true">
              {c.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{c.title}</span>
                <span className="shrink-0 text-xs font-semibold text-sub tabular-nums">
                  {c.progress}/{c.target}
                </span>
              </div>
              <p className="truncate text-xs text-sub">{c.detail}</p>
              {c.claimed ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-green">
                  <Check size={14} /> Claimed
                </p>
              ) : c.done ? (
                <Button size="sm" className="mt-2 h-8 px-3 text-xs" disabled={claiming === c.id} onClick={() => claim(c)}>
                  Claim +{POINTS.challenge}
                </Button>
              ) : (
                <Progress value={c.progress / c.target} className="mt-2 h-1.5" label={`${c.title} progress`} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
