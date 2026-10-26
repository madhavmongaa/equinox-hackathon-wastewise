// Scans taken without a connection wait here (on this device) until you're back online,
// then Home offers to sort them.

import { useSyncExternalStore } from "react"
import type { ImageInput } from "@/lib/types"
import { uuid } from "@/lib/utils"

export interface QueuedScan {
  id: string
  at: string
  image?: ImageInput
  text?: string
}

const KEY = "wastewise.offlineScans.v1"
/** Photos are ~150 KB each; a handful keeps well inside browser storage. */
const MAX = 6
const listeners = new Set<() => void>()
let cache: QueuedScan[] | null = null

function read(): QueuedScan[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedScan[]
  } catch {
    cache = []
  }
  return cache
}

function write(next: QueuedScan[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage full: keep the newest ones that fit
    cache = next.slice(0, 2)
    try {
      localStorage.setItem(KEY, JSON.stringify(cache))
    } catch {
      /* blocked */
    }
  }
  listeners.forEach((l) => l())
}

/** Saves a scan for later; returns false when the queue is full. */
export function queueScan(scan: { image?: ImageInput; text?: string }) {
  const list = read()
  if (list.length >= MAX) return false
  write([...list, { id: uuid(), at: new Date().toISOString(), ...scan }])
  return true
}

export function removeQueued(id: string) {
  write(read().filter((q) => q.id !== id))
}

export function useQueuedScans() {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, read)
}
