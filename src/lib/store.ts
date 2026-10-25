// Profile + points storage.
// With Firebase configured: Anonymous Auth + Firestore `users/{uid}` (public leaderboard).
// Without it: the same rules run against localStorage, and the leaderboard says it isn't connected.

import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore"
import { db, ensureAnonymousUser, firebaseConfigured } from "@/lib/firebase"
import { istWeekId } from "@/lib/dates"
import { cleanNickname, nicknameKey, numberedNickname } from "@/lib/nickname"
import { applyWrite, emptyProfile, planAward, rememberItem, type AwardEvent, type AwardWrite, type Blocked, type ScoredAction } from "@/lib/points"
import type { Profile } from "@/lib/types"

export interface StoredProfile extends Profile {
  pointsReachedAt?: Timestamp | null
  weeklyReachedAt?: Timestamp | null
}

export interface AwardOutcome {
  blocked: Blocked
  events: AwardEvent[]
  total: number
  before: Profile
  after: Profile
}

export interface SettingsPatch {
  displayName?: string
  avatar?: string
  showOnLeaderboard?: boolean
  team?: string
}

export interface ProfileStore {
  mode: "firebase" | "local"
  init(): Promise<string | null>
  /** Point the store at another signed-in account (after sign-in / sign-out). */
  switchUser(uid: string): void
  subscribe(cb: (p: StoredProfile | null) => void): () => void
  fetch(): Promise<StoredProfile | null>
  join(name: string, avatar: string, show: boolean): Promise<Profile>
  updateSettings(patch: SettingsPatch): Promise<void>
  award(action: ScoredAction): Promise<AwardOutcome>
  /** Points for things other than scans (challenges, dump reports): at most 25 per call. */
  bonus(write: AwardWrite): Promise<{ before: Profile; after: Profile }>
}

// ---------- Firestore ----------

function firestoreStore(): ProfileStore {
  let uid: string | null = null
  const userRef = () => doc(db!, "users", uid!)

  async function reserveNickname(name: string, previous?: string): Promise<string> {
    const base = cleanNickname(name)
    for (let n = 1; n < 50; n++) {
      const candidate = n === 1 ? base : numberedNickname(base, n)
      const key = nicknameKey(candidate)
      if (previous && nicknameKey(previous) === key) return candidate
      const ok = await runTransaction(db!, async (tx) => {
        const ref = doc(db!, "nicknames", key)
        const snap = await tx.get(ref)
        if (snap.exists() && snap.data().uid !== uid) return false
        if (!snap.exists()) tx.set(ref, { uid })
        return true
      })
      if (ok) {
        if (previous) {
          // Free the old nickname (best effort; rules only let the owner delete it).
          await deleteDoc(doc(db!, "nicknames", nicknameKey(previous))).catch(() => {})
        }
        return candidate
      }
    }
    throw new Error("Couldn't find a free nickname — try another one.")
  }

  return {
    mode: "firebase",
    async init() {
      uid = await ensureAnonymousUser()
      return uid
    },
    switchUser(next) {
      uid = next
    },
    subscribe(cb) {
      if (!uid) return () => {}
      return onSnapshot(
        userRef(),
        (snap) => {
          const profile = snap.exists() ? (snap.data() as StoredProfile) : null
          if (profile) {
            try {
              localStorage.setItem(LOCAL_KEY, JSON.stringify(profile))
            } catch {}
          }
          cb(profile)
        },
        (err) => {
          console.warn("Firestore profile listener notice, using cached profile:", err?.message || err)
          try {
            const raw = localStorage.getItem(LOCAL_KEY)
            cb(raw ? (JSON.parse(raw) as StoredProfile) : null)
          } catch {
            cb(null)
          }
        }
      )
    },
    async fetch() {
      if (!uid) return null
      const snap = await getDoc(userRef())
      return snap.exists() ? (snap.data() as StoredProfile) : null
    },
    async join(name, avatar, show) {
      const displayName = await reserveNickname(name)
      const profile = emptyProfile(displayName, avatar, show)
      await setDoc(userRef(), { ...profile, createdAt: serverTimestamp(), pointsReachedAt: serverTimestamp(), weeklyReachedAt: serverTimestamp() })
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(profile))
      } catch {}
      return profile
    },
    async updateSettings(patch) {
      const current = (await getDoc(userRef())).data() as StoredProfile | undefined
      const data: SettingsPatch = { ...patch }
      if (patch.displayName && current && nicknameKey(patch.displayName) !== nicknameKey(current.displayName)) {
        data.displayName = await reserveNickname(patch.displayName, current.displayName)
      }
      await updateDoc(userRef(), { ...data })
    },
    async award(action) {
      const snap = await getDoc(userRef())
      if (!snap.exists()) throw new Error("Join the leaderboard first")
      const before = snap.data() as StoredProfile
      const plan = planAward(before, action)
      let after: Profile = before

      for (const w of plan.writes) after = await commit(w)
      if (!plan.blocked) rememberItem(action.itemKey)
      return { blocked: plan.blocked, events: plan.events, total: plan.total, before, after }
    },
    async bonus(w) {
      const snap = await getDoc(userRef())
      if (!snap.exists()) throw new Error("Join the leaderboard first")
      const before = snap.data() as StoredProfile
      const after = await commit({ ...w, amount: Math.min(25, Math.max(0, w.amount)) })
      return { before, after }
    },
  }

  /** One points write, inside a transaction (the security rules allow +25 at most). */
  function commit(w: AwardWrite) {
    return runTransaction(db!, async (tx) => {
      const s = await tx.get(userRef())
      const p = s.data() as StoredProfile
      const week = istWeekId()
      const weekChanged = p.weekId !== week
      const update: Record<string, unknown> = { weekId: week }
      if (w.amount > 0 || weekChanged) {
        update.points = increment(w.amount)
        update.weeklyPoints = weekChanged ? w.amount : increment(w.amount)
      }
      if (w.amount > 0) {
        update.pointsReachedAt = serverTimestamp()
        update.weeklyReachedAt = serverTimestamp()
      }
      if (w.stats) for (const [k, v] of Object.entries(w.stats)) if (v) update[k] = increment(v)
      if (w.day) Object.assign(update, w.day)
      tx.update(userRef(), update)
      return applyWrite(p, w)
    })
  }
}

// ---------- localStorage fallback ----------

const LOCAL_KEY = "wastewise.profile.v1"

function localStore(): ProfileStore {
  const listeners = new Set<(p: StoredProfile | null) => void>()
  const read = (): StoredProfile | null => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? (JSON.parse(raw) as StoredProfile) : null
    } catch {
      return null
    }
  }
  const write = (p: Profile) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(p))
    listeners.forEach((l) => l(p))
  }
  return {
    mode: "local",
    async init() {
      return null
    },
    switchUser() {
      /* no accounts without Firebase */
    },
    subscribe(cb) {
      listeners.add(cb)
      cb(read())
      return () => listeners.delete(cb)
    },
    async fetch() {
      return read()
    },
    async join(name, avatar, show) {
      const p = emptyProfile(cleanNickname(name), avatar, show)
      write(p)
      return p
    },
    async updateSettings(patch) {
      const p = read()
      if (p) write({ ...p, ...patch, displayName: patch.displayName ? cleanNickname(patch.displayName) : p.displayName })
    },
    async award(action) {
      const before = read()
      if (!before) throw new Error("Join first")
      const plan = planAward(before, action)
      const after = plan.writes.reduce((p, w) => applyWrite(p, w), before as Profile)
      write(after)
      if (!plan.blocked) rememberItem(action.itemKey)
      return { blocked: plan.blocked, events: plan.events, total: plan.total, before, after }
    },
    async bonus(w) {
      const before = read()
      if (!before) throw new Error("Join first")
      const after = applyWrite(before, { ...w, amount: Math.min(25, Math.max(0, w.amount)) })
      write(after)
      return { before, after }
    },
  }
}

function hybridStore(): ProfileStore {
  const local = localStore()
  if (!firebaseConfigured) return local

  const fs = firestoreStore()
  let useFallback = false

  return {
    get mode() {
      return useFallback ? "local" : "firebase"
    },
    switchUser(uid) {
      fs.switchUser(uid)
      // the cached profile belonged to the previous account
      try {
        localStorage.removeItem(LOCAL_KEY)
      } catch {}
    },
    async init() {
      try {
        const id = await fs.init()
        return id
      } catch (err) {
        console.warn("Firestore init failed, using local profile store:", err)
        useFallback = true
        return null
      }
    },
    subscribe(cb) {
      if (useFallback) return local.subscribe(cb)
      // listen to both, so a later fall back to the local store (say Firestore refuses a
      // write) still reaches the screens
      const stopFs = fs.subscribe((p) => !useFallback && cb(p))
      const stopLocal = local.subscribe((p) => useFallback && cb(p))
      return () => {
        stopFs()
        stopLocal()
      }
    },
    async fetch() {
      if (useFallback) return local.fetch()
      try {
        const p = await fs.fetch()
        return p ?? local.fetch()
      } catch (err) {
        console.warn("Firestore fetch failed, using local store:", err)
        useFallback = true
        return local.fetch()
      }
    },
    async join(name, avatar, show) {
      if (useFallback) return local.join(name, avatar, show)
      try {
        const p = await fs.join(name, avatar, show)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(p))
        } catch {}
        return p
      } catch (err) {
        console.warn("Firestore join failed, falling back to local store:", err)
        useFallback = true
        return local.join(name, avatar, show)
      }
    },
    async updateSettings(patch) {
      if (useFallback) return local.updateSettings(patch)
      try {
        await fs.updateSettings(patch)
        await local.updateSettings(patch).catch(() => {})
      } catch (err) {
        console.warn("Firestore updateSettings failed, falling back to local store:", err)
        useFallback = true
        return local.updateSettings(patch)
      }
    },
    async award(action) {
      if (useFallback) return local.award(action)
      try {
        const res = await fs.award(action)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(res.after))
        } catch {}
        return res
      } catch (err) {
        console.warn("Firestore award failed, falling back to local store:", err)
        useFallback = true
        return local.award(action)
      }
    },
    async bonus(w) {
      if (useFallback) return local.bonus(w)
      try {
        const res = await fs.bonus(w)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(res.after))
        } catch {}
        return res
      } catch (err) {
        console.warn("Firestore bonus failed, falling back to local store:", err)
        useFallback = true
        return local.bonus(w)
      }
    },
  }
}

export const profileStore: ProfileStore = hybridStore()
