import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { buildHistoryEntry, itemKey } from "@/lib/flow"
import { fetchMyRank } from "@/lib/leaderboard"
import { loadHistory, saveHistory } from "@/lib/history"
import { levelFor, type Level } from "@/lib/levels"
import type { ScoredAction } from "@/lib/points"
import { cropThumbnail } from "@/lib/segment"
import { profileStore, type AwardOutcome, type SettingsPatch, type StoredProfile } from "@/lib/store"
import type { HistoryEntry, ImageInput, Outcome, ScanAI, ScanInput, SingleOutcome } from "@/lib/types"
import { uuid } from "@/lib/utils"

export interface ScanStart {
  key: string
  image?: ImageInput
  text?: string
}

export type Screen =
  | { name: "home" }
  | { name: "scan"; start?: ScanStart }
  | { name: "leaderboard" }
  | { name: "history" }
  | { name: "historyDetail"; id: string }
  | { name: "profile" }
  | { name: "guide" }

// Each screen has an address, so links like /app.html#leaderboard open it directly.
// "#lulu" opens the chat on top of Home.
function screenFromHash(hash: string): { screen: Screen; chat: boolean } {
  const [name, id] = hash.replace(/^#\/?/, "").split("/")
  switch (name) {
    case "scan":
    case "leaderboard":
    case "history":
    case "profile":
    case "guide":
      if (name === "history" && id) return { screen: { name: "historyDetail", id: decodeURIComponent(id) }, chat: false }
      return { screen: { name }, chat: false }
    case "lulu":
      return { screen: { name: "home" }, chat: true }
    default:
      return { screen: { name: "home" }, chat: false }
  }
}

function hashForScreen(s: Screen) {
  if (s.name === "home") return ""
  if (s.name === "historyDetail") return `#history/${encodeURIComponent(s.id)}`
  return `#${s.name}`
}

export type ToastTone = "points" | "info" | "happy" | "error"
export interface Toast {
  id: string
  text: string
  tone: ToastTone
}

export interface FinishArgs {
  input: ScanInput
  outcome: Outcome
  originalAi: ScanAI | null
}

interface PendingAward {
  action: ScoredAction
  entryId: string
}

interface AppState {
  screen: Screen
  navigate: (s: Screen) => void
  history: HistoryEntry[]
  clearHistory: () => void
  profile: StoredProfile | null
  profileLoaded: boolean
  storeMode: "firebase" | "local"
  uid: string | null
  authError: string | null
  finishScan: (args: FinishArgs) => Promise<AwardOutcome | null>
  toasts: Toast[]
  toast: (text: string, tone?: ToastTone) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  joinOpen: boolean
  openJoin: () => void
  closeJoin: () => void
  join: (name: string, avatar: string, show: boolean) => Promise<void>
  updateSettings: (patch: SettingsPatch) => Promise<void>
  levelUp: Level | null
  dismissLevelUp: () => void
  /** bumps whenever points change, so rank widgets can refetch */
  pointsVersion: number
}

const Ctx = createContext<AppState | null>(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp must be used inside AppProvider")
  return v
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useRef(screenFromHash(window.location.hash)).current
  const [screen, setScreen] = useState<Screen>(initial.screen)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [profile, setProfile] = useState<StoredProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [chatOpen, setChatOpenState] = useState(initial.chat)
  const [joinOpen, setJoinOpen] = useState(false)
  const [levelUp, setLevelUp] = useState<Level | null>(null)
  const [pointsVersion, setPointsVersion] = useState(0)
  const pending = useRef<PendingAward[]>([])
  const profileRef = useRef<StoredProfile | null>(null)
  profileRef.current = profile

  // ---------- profile ----------
  useEffect(() => {
    let unsub = () => {}
    let cancelled = false
    profileStore
      .init()
      .then((id) => {
        if (cancelled) return
        setUid(id)
        unsub = profileStore.subscribe((p) => {
          setProfile(p)
          setProfileLoaded(true)
        })
      })
      .catch((err) => {
        console.error("Anonymous sign-in failed", err)
        setAuthError("Couldn't connect to the leaderboard. Check your connection.")
        setProfileLoaded(true)
      })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  // ---------- history ----------
  const updateHistory = useCallback((fn: (list: HistoryEntry[]) => HistoryEntry[]) => {
    setHistory((prev) => {
      const next = fn(prev)
      saveHistory(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => updateHistory(() => []), [updateHistory])

  // ---------- toasts ----------
  const toast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = uuid()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 4200 : 2800)
  }, [])

  const screenRef = useRef(screen)
  screenRef.current = screen

  const navigate = useCallback((s: Screen) => {
    setScreen(s)
    const hash = hashForScreen(s)
    if (hash !== window.location.hash) {
      // a real history entry, so the browser back button works
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${hash}`)
    }
    window.scrollTo({ top: 0 })
  }, [])

  // back/forward buttons and links to an address on the same page
  useEffect(() => {
    const onHash = () => {
      const next = screenFromHash(window.location.hash)
      // keep in-memory details (e.g. a scan's photo) when the address already matches
      if (hashForScreen(screenRef.current) !== hashForScreen(next.screen)) {
        setScreen(next.screen)
        window.scrollTo({ top: 0 })
      }
      if (next.chat) setChatOpenState(true)
    }
    window.addEventListener("hashchange", onHash)
    window.addEventListener("popstate", onHash)
    return () => {
      window.removeEventListener("hashchange", onHash)
      window.removeEventListener("popstate", onHash)
    }
  }, [])

  const setChatOpen = useCallback((open: boolean) => {
    setChatOpenState(open)
    // closing the chat that was opened by a "#lulu" link leaves a clean address
    if (!open && window.location.hash === "#lulu") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
    }
  }, [])

  // ---------- points ----------
  const weeklyRank = useCallback(async (p: StoredProfile | null) => {
    if (!p || profileStore.mode !== "firebase") return null
    return fetchMyRank("week", p).catch(() => null)
  }, [])

  const applyAward = useCallback(
    async ({ action, entryId }: PendingAward): Promise<AwardOutcome | null> => {
      try {
        const rankBefore = await weeklyRank(profileRef.current)
        const out = await profileStore.award(action)
        updateHistory((list) => list.map((e) => (e.id === entryId ? { ...e, points_awarded: out.total } : e)))
        setPointsVersion((v) => v + 1)

        if (out.blocked === "daily_limit") toast("Daily points limit reached — come back tomorrow 🌙", "info")
        else if (out.blocked === "duplicate") toast("Already counted this item in the last 10 minutes — no extra points", "info")
        else if (out.total > 0) toast(`+${out.total} Eco Points 🌱`, "points")

        const lvBefore = levelFor(out.before.points)
        const lvAfter = levelFor(out.after.points)
        if (lvAfter.index > lvBefore.index) setLevelUp(lvAfter.level)

        if (out.total > 0 && profileStore.mode === "firebase") {
          const fresh = await profileStore.fetch()
          const rankAfter = await weeklyRank(fresh)
          if (rankAfter && rankBefore && rankAfter < rankBefore) {
            setTimeout(() => toast(`You moved up to #${rankAfter} this week! 🎉`, "happy"), 900)
          }
        }
        return out
      } catch (err) {
        console.error("Awarding points failed", err)
        toast("Saved to history, but points couldn't be added right now.", "error")
        return null
      }
    },
    [toast, updateHistory, weeklyRank]
  )

  const finishOne = useCallback(
    async ({ input, outcome, originalAi }: { input: ScanInput; outcome: SingleOutcome; originalAi: ScanAI | null }) => {
      const entry = buildHistoryEntry({ input, outcome, originalAi, points: 0 })
      updateHistory((list) => [entry, ...list])
      const action: ScoredAction = {
        ruleFound: outcome.kind === "result",
        clarifications: input.clarifications.length,
        corrected: !!input.correctedItem,
        itemKey: itemKey(outcome, input),
      }
      if (profileStore.mode === "firebase" && !uid) {
        toast("Saved to history. Points need a connection to the leaderboard.", "info")
        return null
      }
      if (!profileRef.current) {
        pending.current.push({ action, entryId: entry.id })
        setJoinOpen(true)
        return null
      }
      return applyAward({ action, entryId: entry.id })
    },
    [applyAward, toast, uid, updateHistory]
  )

  /** Saves a finished scan. A multi-item scan becomes one history entry (and award) per item. */
  const finishScan = useCallback(
    async ({ input, outcome, originalAi }: FinishArgs) => {
      if (outcome.kind === "clarify") return null
      if (outcome.kind !== "multi") return finishOne({ input, outcome, originalAi })
      let last: AwardOutcome | null = null
      for (const part of outcome.parts) {
        let image = input.image
        if (image && part.box) {
          const thumbnail = await cropThumbnail(image.dataUrl, part.box).catch(() => image!.thumbnail)
          image = { ...image, thumbnail }
        }
        last = await finishOne({ input: { ...input, image }, outcome: part.outcome, originalAi: part.ai })
      }
      return last
    },
    [finishOne]
  )

  const join = useCallback(
    async (name: string, avatar: string, show: boolean) => {
      await profileStore.join(name, avatar, show)
      profileRef.current = await profileStore.fetch()
      setJoinOpen(false)
      const queue = pending.current.splice(0)
      for (const p of queue) await applyAward(p)
    },
    [applyAward]
  )

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    await profileStore.updateSettings(patch)
    setPointsVersion((v) => v + 1)
  }, [])

  const value = useMemo<AppState>(
    () => ({
      screen,
      navigate,
      history,
      clearHistory,
      profile,
      profileLoaded,
      storeMode: profileStore.mode,
      uid,
      authError,
      finishScan,
      toasts,
      toast,
      chatOpen,
      setChatOpen,
      joinOpen,
      openJoin: () => setJoinOpen(true),
      closeJoin: () => setJoinOpen(false),
      join,
      updateSettings,
      levelUp,
      dismissLevelUp: () => setLevelUp(null),
      pointsVersion,
    }),
    [screen, navigate, history, clearHistory, profile, profileLoaded, uid, authError, finishScan, toasts, toast, chatOpen, setChatOpen, joinOpen, join, updateSettings, levelUp, pointsVersion]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
