// Weekly challenges. Four are picked from the pool each IST week (the same four for
// everyone), progress is counted from this week's scan history and activity log, and a
// finished challenge can be claimed once for bonus points.

import { istDate, istWeekId } from "@/lib/dates"
import type { Activity } from "@/lib/activity"
import type { HistoryEntry } from "@/lib/types"

export interface ChallengeDef {
  id: string
  title: string
  detail: string
  emoji: string
  target: number
  count: (week: { scans: HistoryEntry[]; activity: Activity[] }) => number
}

const inCategory = (ids: string[]) => (w: { scans: HistoryEntry[] }) => w.scans.filter((s) => s.category_id && ids.includes(s.category_id)).length

export const CHALLENGE_POOL: ChallengeDef[] = [
  { id: "sort10", title: "Sort 10 items", detail: "Any item, any bin", emoji: "♻️", target: 10, count: (w) => w.scans.length },
  { id: "dry3", title: "Dry-waste trio", detail: "Sort 3 items for the blue bin", emoji: "🧴", target: 3, count: inCategory(["dry"]) },
  { id: "wet3", title: "Compost crew", detail: "Sort 3 items for the green bin", emoji: "🍌", target: 3, count: inCategory(["wet"]) },
  { id: "ewaste1", title: "Safe disposal", detail: "Sort an e-waste or hazardous item", emoji: "🔋", target: 1, count: inCategory(["ewaste", "hazardous"]) },
  {
    id: "days3",
    title: "Three-day habit",
    detail: "Sort something on 3 different days",
    emoji: "📅",
    target: 3,
    count: (w) => new Set(w.scans.map((s) => istDate(new Date(s.timestamp)))).size,
  },
  {
    id: "dump1",
    title: "Dump spotter",
    detail: "Report an illegal dump",
    emoji: "📍",
    target: 1,
    count: (w) => w.activity.filter((a) => a.type === "dump_report").length,
  },
  {
    id: "photo5",
    title: "Snap five",
    detail: "Scan 5 items with the camera",
    emoji: "📸",
    target: 5,
    count: (w) => w.scans.filter((s) => s.input_type !== "text").length,
  },
  {
    id: "fix1",
    title: "Sharp eye",
    detail: "Correct one identification",
    emoji: "🛠️",
    target: 1,
    count: (w) => w.scans.filter((s) => s.corrected_item).length,
  },
]

/** Same four challenges for everyone in a given week; "Dump spotter" is always one of them. */
export function challengesForWeek(weekId = istWeekId()): ChallengeDef[] {
  let seed = [...weekId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const rest = CHALLENGE_POOL.filter((c) => c.id !== "dump1")
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [CHALLENGE_POOL.find((c) => c.id === "dump1")!, ...rest.slice(0, 3)]
}

export interface ChallengeProgress extends ChallengeDef {
  progress: number
  done: boolean
  claimed: boolean
}

export function weekProgress(history: HistoryEntry[], activity: Activity[], claimed: string[], weekId = istWeekId()): ChallengeProgress[] {
  const inWeek = (iso: string) => istWeekId(new Date(iso)) === weekId
  const week = { scans: history.filter((h) => inWeek(h.timestamp)), activity: activity.filter((a) => inWeek(a.at)) }
  return challengesForWeek(weekId).map((c) => {
    const progress = Math.min(c.target, c.count(week))
    return { ...c, progress, done: progress >= c.target, claimed: claimed.includes(c.id) }
  })
}

// ---------- claimed challenges (per account, per week, on this device) ----------

const claimKey = (uid: string | null, weekId: string) => `wastewise.challenges.${uid ?? "local"}.${weekId}`

export function loadClaimed(uid: string | null, weekId = istWeekId()): string[] {
  try {
    return JSON.parse(localStorage.getItem(claimKey(uid, weekId)) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function saveClaimed(uid: string | null, ids: string[], weekId = istWeekId()) {
  try {
    localStorage.setItem(claimKey(uid, weekId), JSON.stringify(ids))
  } catch {
    /* storage blocked */
  }
}

/** Days and hours until the week resets (Monday 00:00 IST). */
export function weekEndsIn(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600000)
  const dow = ist.getUTCDay() || 7
  const end = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + (8 - dow))
  const hours = Math.max(0, Math.round((end - ist.getTime()) / 3600000))
  return hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h left` : `${hours}h left`
}
