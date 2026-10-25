// Things you do besides scanning (reporting a dump, claiming a challenge), kept on this
// device like scan history, so weekly challenges can count them.

import { useSyncExternalStore } from "react"

export type ActivityType = "dump_report"

export interface Activity {
  type: ActivityType
  at: string
}

const KEY = "wastewise.activity.v1"
const listeners = new Set<() => void>()
let cache: Activity[] | null = null

function read(): Activity[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Activity[]
  } catch {
    cache = []
  }
  return cache
}

export function logActivity(type: ActivityType) {
  // keep the last 200 so the list never grows without bound
  cache = [{ type, at: new Date().toISOString() }, ...read()].slice(0, 200)
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage blocked: still counts for this visit */
  }
  listeners.forEach((l) => l())
}

export function useActivity() {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, read)
}
