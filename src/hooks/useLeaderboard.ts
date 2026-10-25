import { useEffect, useState } from "react"
import { fetchMyRank, subscribeTeams, subscribeTop, type BoardRow, type BoardTab, type TeamRow } from "@/lib/leaderboard"
import { useApp } from "@/state/AppContext"

export function useLeaderboard(tab: BoardTab, n = 50) {
  const { storeMode, uid } = useApp()
  const [rows, setRows] = useState<BoardRow[]>([])
  const [loading, setLoading] = useState(storeMode === "firebase")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (storeMode !== "firebase" || !uid) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    return subscribeTop(
      tab,
      n,
      (r) => {
        setRows(r)
        setLoading(false)
      },
      (e) => {
        setError(e.message.includes("index") ? "The leaderboard index is still being created in Firestore. Try again in a few minutes." : "Couldn't load the leaderboard right now.")
        setLoading(false)
      }
    )
  }, [tab, n, storeMode, uid])

  return { rows, loading, error, connected: storeMode === "firebase" }
}

/** The user's own rank (weekly or all-time), refetched whenever points change. */
export function useMyRank(tab: BoardTab, rows?: BoardRow[]) {
  const { profile, uid, storeMode, pointsVersion } = useApp()
  const [rank, setRank] = useState<number | null>(null)
  const inList = rows && uid ? rows.findIndex((r) => r.uid === uid) : -1

  useEffect(() => {
    if (inList >= 0) return setRank(inList + 1)
    if (storeMode !== "firebase" || !profile) return setRank(null)
    let cancelled = false
    fetchMyRank(tab, profile)
      .then((r) => !cancelled && setRank(r))
      .catch(() => !cancelled && setRank(null))
    return () => {
      cancelled = true
    }
  }, [tab, profile, storeMode, pointsVersion, inList])

  return rank
}

/** This week's team totals (live). */
export function useTeamBoard(enabled = true) {
  const { storeMode, uid } = useApp()
  const [rows, setRows] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(storeMode === "firebase")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || storeMode !== "firebase" || !uid) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    return subscribeTeams(
      (r) => {
        setRows(r)
        setLoading(false)
      },
      () => {
        setError("Couldn't load the team scores right now.")
        setLoading(false)
      }
    )
  }, [enabled, storeMode, uid])

  return { rows, loading, error, connected: storeMode === "firebase" }
}
