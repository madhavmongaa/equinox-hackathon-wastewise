import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { flyPoints } from "@/lib/fx"
import { buildHistoryEntry, itemKey } from "@/lib/flow"
import { fetchMyRank } from "@/lib/leaderboard"
import { loadHistory, saveHistory } from "@/lib/history"
import { levelFor, type Level } from "@/lib/levels"
import type { AwardWrite, ScoredAction } from "@/lib/points"
import { watchUser } from "@/lib/firebase"
import { scanLocation, type LatLng } from "@/lib/location"
import type { ScrapKind } from "@/lib/scrap"
import { cropThumbnail } from "@/lib/segment"
import { profileStore, type AwardOutcome, type SettingsPatch, type StoredProfile } from "@/lib/store"
import type { HistoryEntry, ImageInput, Outcome, ScanAI, ScanInput, SingleOutcome } from "@/lib/types"
import { prefersReducedMotion, uuid } from "@/lib/utils"

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
  | { name: "dumps"; dumpId?: string }
  | { name: "kabadiwala"; kinds?: ScrapKind[]; from?: string }
  | { name: "cleaning" }
  | { name: "impact" }
  | { name: "bins"; category?: string }
  | { name: "admin" }
  | { name: "account"; mode?: "create" | "signin" | "reset" }

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
    case "dumps":
    case "kabadiwala":
    case "cleaning":
    case "impact":
    case "admin":
    case "account":
      if (name === "history" && id) return { screen: { name: "historyDetail", id: decodeURIComponent(id) }, chat: false }
      return { screen: { name }, chat: false }
    case "bins":
      return { screen: { name: "bins", category: id ? decodeURIComponent(id) : undefined }, chat: false }
    case "lulu":
      return { screen: { name: "home" }, chat: true }
    default:
      return { screen: { name: "home" }, chat: false }
  }
}

function hashForScreen(s: Screen) {
  if (s.name === "home") return ""
  if (s.name === "historyDetail") return `#history/${encodeURIComponent(s.id)}`
  if (s.name === "bins") return s.category ? `#bins/${encodeURIComponent(s.category)}` : "#bins"
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
  /** Points for a challenge or a dump report; false when there's no profile to add them to. */
  awardBonus: (write: AwardWrite, label: string) => Promise<boolean>
  toasts: Toast[]
  toast: (text: string, tone?: ToastTone) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  /** Opens the chat and sends this message to Lulu. */
  askLulu: (text: string) => void
  /** The message waiting to be sent when the chat opens (taken by the chat). */
  luluPrompt: { id: string; text: string } | null
  takeLuluPrompt: () => void
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
  const [luluPrompt, setLuluPrompt] = useState<{ id: string; text: string } | null>(null)
  const [joinOpen, setJoinOpen] = useState(false)
  const [levelUp, setLevelUp] = useState<Level | null>(null)
  const [pointsVersion, setPointsVersion] = useState(0)
  const pending = useRef<PendingAward[]>([])
  const profileRef = useRef<StoredProfile | null>(null)
  profileRef.current = profile

  // ---------- profile ----------
  const currentUid = useRef<string | null>(null)
  useEffect(() => {
    let unsub = () => {}
    let stopWatching = () => {}
    let cancelled = false
    profileStore
      .init()
      .then((id) => {
        if (cancelled) return
        currentUid.current = id
        setUid(id)
        unsub = profileStore.subscribe((p) => {
          setProfile(p)
          setProfileLoaded(true)
        })
        // signing in, out or switching accounts: follow the new account's profile
        stopWatching = watchUser((user) => {
          if (cancelled || !user || user.uid === currentUid.current) return
          currentUid.current = user.uid
          unsub()
          profileStore.switchUser(user.uid)
          setUid(user.uid)
          setProfile(null)
          setProfileLoaded(false)
          unsub = profileStore.subscribe((p) => {
            setProfile(p)
            setProfileLoaded(true)
          })
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
      stopWatching()
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
    // cross-fade between pages where the browser supports View Transitions. The transition
    // waits for a painted frame; if none comes soon (hidden or throttled page), skip it and
    // change the page directly, so navigation never depends on the animation.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { skipTransition?: () => void } }
    if (doc.startViewTransition && !prefersReducedMotion() && hashForScreen(s) !== hashForScreen(screenRef.current)) {
      let swapped = false
      const swap = () => {
        if (swapped) return
        swapped = true
        flushSync(() => setScreen(s))
      }
      const vt = doc.startViewTransition(swap)
      setTimeout(() => {
        if (swapped) return
        vt.skipTransition?.()
        swap()
      }, 250)
    } else {
      setScreen(s)
    }
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

  const askLulu = useCallback((text: string) => {
    setLuluPrompt({ id: uuid(), text })
    setChatOpenState(true)
  }, [])
  const takeLuluPrompt = useCallback(() => setLuluPrompt(null), [])

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
        else if (out.total > 0) {
          toast(`+${out.total} Eco Points 🌱`, "points")
          flyPoints(out.total)
        }

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
    async ({ input, outcome, originalAi, location }: { input: ScanInput; outcome: SingleOutcome; originalAi: ScanAI | null; location: LatLng | null }) => {
      const entry = buildHistoryEntry({ input, outcome, originalAi, points: 0, location })
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
      const location = await scanLocation()
      if (outcome.kind !== "multi") return finishOne({ input, outcome, originalAi, location })
      let last: AwardOutcome | null = null
      for (const part of outcome.parts) {
        let image = input.image
        if (image && part.box) {
          const thumbnail = await cropThumbnail(image.dataUrl, part.box).catch(() => image!.thumbnail)
          image = { ...image, thumbnail }
        }
        last = await finishOne({ input: { ...input, image }, outcome: part.outcome, originalAi: part.ai, location })
      }
      return last
    },
    [finishOne]
  )

  const awardBonus = useCallback(
    async (write: AwardWrite, label: string) => {
      if (!profileRef.current) return false
      try {
        const { before, after } = await profileStore.bonus(write)
        setPointsVersion((v) => v + 1)
        if (write.amount > 0) {
          toast(`+${write.amount} Eco Points · ${label} 🌱`, "points")
          flyPoints(write.amount)
        }
        const lvBefore = levelFor(before.points)
        const lvAfter = levelFor(after.points)
        if (lvAfter.index > lvBefore.index) setLevelUp(lvAfter.level)
        return true
      } catch (err) {
        console.error("Bonus points failed", err)
        toast("Points couldn't be added right now.", "error")
        return false
      }
    },
    [toast]
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
      awardBonus,
      toasts,
      toast,
      chatOpen,
      setChatOpen,
      askLulu,
      luluPrompt,
      takeLuluPrompt,
      joinOpen,
      openJoin: () => setJoinOpen(true),
      closeJoin: () => setJoinOpen(false),
      join,
      updateSettings,
      levelUp,
      dismissLevelUp: () => setLevelUp(null),
      pointsVersion,
    }),
    [screen, navigate, history, clearHistory, profile, profileLoaded, uid, authError, finishScan, awardBonus, toasts, toast, chatOpen, setChatOpen, askLulu, luluPrompt, takeLuluPrompt, joinOpen, join, updateSettings, levelUp, pointsVersion]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
