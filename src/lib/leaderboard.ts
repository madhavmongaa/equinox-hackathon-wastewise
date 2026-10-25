import {
  collection,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { istWeekId } from "@/lib/dates"
import type { StoredProfile } from "@/lib/store"

export type BoardTab = "week" | "all"

export interface BoardRow {
  uid: string
  displayName: string
  avatar: string
  /** all-time points (for the level badge) */
  points: number
  /** the value ranked on this tab */
  value: number
}

const fields = (tab: BoardTab) =>
  tab === "week"
    ? { value: "weeklyPoints", reached: "weeklyReachedAt" }
    : { value: "points", reached: "pointsReachedAt" }

function baseConstraints(tab: BoardTab): QueryConstraint[] {
  const c: QueryConstraint[] = [where("showOnLeaderboard", "==", true)]
  if (tab === "week") c.push(where("weekId", "==", istWeekId()))
  return c
}

/** Live top-N (5.5). Ties: whoever reached the score first ranks higher. */
export function subscribeTop(tab: BoardTab, n: number, cb: (rows: BoardRow[]) => void, onError: (e: Error) => void) {
  if (!db) return () => {}
  const f = fields(tab)
  const q = query(
    collection(db, "users"),
    ...baseConstraints(tab),
    where(f.value, ">", 0),
    orderBy(f.value, "desc"),
    orderBy(f.reached, "asc"),
    limit(n)
  )
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const p = d.data() as StoredProfile
          return {
            uid: d.id,
            displayName: p.displayName,
            avatar: p.avatar,
            points: p.points ?? 0,
            value: (tab === "week" ? p.weeklyPoints : p.points) ?? 0,
          }
        })
      ),
    (err) => {
      console.error("Leaderboard listener failed", err)
      onError(err)
    }
  )
}

/**
 * The user's rank among visible users, even outside the top 50.
 * Hidden users still see where they would rank.
 */
export async function fetchMyRank(tab: BoardTab, me: StoredProfile): Promise<number | null> {
  if (!db) return null
  const f = fields(tab)
  const mine = tab === "week" ? (me.weekId === istWeekId() ? me.weeklyPoints : 0) : me.points
  if (!mine) return null
  const reachedAt = (tab === "week" ? me.weeklyReachedAt : me.pointsReachedAt) ?? null
  const users = collection(db, "users")
  const ahead = await getCountFromServer(query(users, ...baseConstraints(tab), where(f.value, ">", mine)))
  let tiedAhead = 0
  if (reachedAt) {
    const tied = await getCountFromServer(
      query(users, ...baseConstraints(tab), where(f.value, "==", mine), where(f.reached, "<", reachedAt))
    )
    tiedAhead = tied.data().count
  }
  return ahead.data().count + tiedAhead + 1
}

export interface TeamRow {
  team: string
  points: number
  members: number
}

/**
 * This week's team totals: everyone visible who scored this week, added up by team.
 * Campus-sized, so one query of up to 500 profiles is enough.
 */
export function subscribeTeams(cb: (rows: TeamRow[]) => void, onError: (e: Error) => void) {
  if (!db) return () => {}
  const q = query(collection(db, "users"), ...baseConstraints("week"), limit(500))
  return onSnapshot(
    q,
    (snap) => {
      const totals: Record<string, TeamRow> = {}
      snap.docs.forEach((d) => {
        const p = d.data() as StoredProfile
        if (!p.team) return
        const row = (totals[p.team] ??= { team: p.team, points: 0, members: 0 })
        row.points += p.weeklyPoints ?? 0
        row.members++
      })
      cb(Object.values(totals).sort((a, b) => b.points - a.points))
    },
    (err) => {
      console.error("Team leaderboard listener failed", err)
      onError(err)
    }
  )
}
