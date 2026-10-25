// Points rules (5.3). Pure functions shared by the Firestore and local stores,
// so the screens and Lulu award exactly the same points.

import { istDate, istWeekId, istYesterday } from "@/lib/dates"
import type { Profile } from "@/lib/types"

export const POINTS = {
  guideResult: 10,
  notInGuide: 3,
  clarification: 5,
  correction: 5,
  firstScanOfDay: 5,
  streak7: 25,
  dumpReport: 10,
  challenge: 25,
} as const

export const DAILY_SCAN_LIMIT = 20
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

export interface ScoredAction {
  ruleFound: boolean
  clarifications: number
  corrected: boolean
  itemKey: string
}

export interface AwardEvent {
  amount: number
  label: string
}

export type Blocked = "daily_limit" | "duplicate" | null

/** One Firestore write: at most 25 points each (matches the security rules). */
export interface AwardWrite {
  amount: number
  stats?: Partial<Pick<Profile, "totalScans" | "rulesFound" | "corrections" | "clarificationsAnswered" | "scoredToday" | "dumpsReported" | "challengesCompleted">>
  day?: Pick<Profile, "streakDays" | "longestStreak" | "lastActiveDate" | "scoredToday">
}

export function emptyProfile(displayName: string, avatar: string, showOnLeaderboard: boolean): Profile {
  return {
    displayName,
    avatar,
    points: 0,
    weeklyPoints: 0,
    weekId: istWeekId(),
    totalScans: 0,
    rulesFound: 0,
    corrections: 0,
    clarificationsAnswered: 0,
    streakDays: 0,
    longestStreak: 0,
    lastActiveDate: "",
    scoredToday: 0,
    showOnLeaderboard,
  }
}

/** Streak as it should be displayed today (it lapses after a missed day). */
export function currentStreak(p: Profile | null) {
  if (!p) return 0
  return p.lastActiveDate === istDate() || p.lastActiveDate === istYesterday() ? p.streakDays : 0
}

export function weeklyPointsNow(p: Profile | null) {
  if (!p) return 0
  return p.weekId === istWeekId() ? p.weeklyPoints : 0
}

// ---------- duplicate check (same item within 10 minutes, per device) ----------

const RECENT_KEY = "wastewise.recentItems.v1"

function loadRecent(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "{}")
  } catch {
    return {}
  }
}

export function isDuplicate(key: string, now = Date.now()) {
  const t = loadRecent()[key]
  return typeof t === "number" && now - t < DUPLICATE_WINDOW_MS
}

export function rememberItem(key: string, now = Date.now()) {
  const recent = loadRecent()
  for (const k of Object.keys(recent)) if (now - recent[k] > DUPLICATE_WINDOW_MS) delete recent[k]
  recent[key] = now
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    /* ignore */
  }
}

// ---------- planning ----------

export function planAward(prev: Profile, action: ScoredAction, now = new Date()) {
  const today = istDate(now)
  const firstToday = prev.lastActiveDate !== today
  const scoredToday = firstToday ? 0 : prev.scoredToday

  let blocked: Blocked = null
  if (scoredToday >= DAILY_SCAN_LIMIT) blocked = "daily_limit"
  else if (isDuplicate(action.itemKey, now.getTime())) blocked = "duplicate"

  let streakDays = prev.streakDays
  if (firstToday) streakDays = prev.lastActiveDate === istYesterday(now) ? prev.streakDays + 1 : 1

  const events: AwardEvent[] = []
  const writes: AwardWrite[] = []

  const base = blocked ? 0 : action.ruleFound ? POINTS.guideResult : POINTS.notInGuide
  const dayBonus = !blocked && firstToday ? POINTS.firstScanOfDay : 0
  if (base) events.push({ amount: base, label: action.ruleFound ? "Sorted with the guide" : "Scan logged" })
  if (dayBonus) events.push({ amount: dayBonus, label: "First scan of the day" })

  writes.push({
    amount: base + dayBonus,
    stats: {
      totalScans: 1,
      rulesFound: action.ruleFound ? 1 : 0,
      corrections: action.corrected ? 1 : 0,
      clarificationsAnswered: action.clarifications,
    },
    day: {
      streakDays,
      longestStreak: Math.max(prev.longestStreak ?? 0, streakDays),
      lastActiveDate: today,
      scoredToday: scoredToday + (blocked ? 0 : 1),
    },
  })

  if (!blocked) {
    const extra = action.clarifications * POINTS.clarification + (action.corrected ? POINTS.correction : 0)
    if (action.clarifications) events.push({ amount: action.clarifications * POINTS.clarification, label: "Answered Lulu's question" })
    if (action.corrected) events.push({ amount: POINTS.correction, label: "Fixed an identification" })
    if (extra) writes.push({ amount: Math.min(extra, 25) })

    if (firstToday && streakDays > 0 && streakDays % 7 === 0) {
      events.push({ amount: POINTS.streak7, label: `${streakDays}-day streak!` })
      writes.push({ amount: POINTS.streak7 })
    }
  }

  return { blocked, events, writes, total: events.reduce((s, e) => s + e.amount, 0) }
}

/** Applies one write to a profile (used by the local store and for optimistic UI). */
export function applyWrite(p: Profile, w: AwardWrite, now = new Date()): Profile {
  const week = istWeekId(now)
  const sameWeek = p.weekId === week
  const next: Profile = {
    ...p,
    points: p.points + w.amount,
    weeklyPoints: (sameWeek ? p.weeklyPoints : 0) + w.amount,
    weekId: week,
  }
  if (w.stats) {
    for (const [k, v] of Object.entries(w.stats) as [keyof NonNullable<AwardWrite["stats"]>, number][]) {
      next[k] = (p[k] ?? 0) + v
    }
  }
  if (w.day) Object.assign(next, w.day)
  return next
}
