// Dumps you reported from this device, with the last status you were told about, so the
// app can tell you when a crew is on it and when it's cleaned.

import { useEffect, useSyncExternalStore } from "react"
import type { DumpReport, DumpStatus } from "@/dumps/types"

export interface MyReport {
  id: string
  title: string
  status: DumpStatus
  reportedAt: string
}

const KEY = "wastewise.myReports.v1"
const listeners = new Set<() => void>()
let cache: MyReport[] | null = null

function read(): MyReport[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as MyReport[]
  } catch {
    cache = []
  }
  return cache
}

function write(next: MyReport[]) {
  cache = next.slice(0, 30)
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l())
}

export function rememberReport(d: DumpReport) {
  write([{ id: d.id, title: d.title, status: d.status, reportedAt: d.createdAt }, ...read().filter((r) => r.id !== d.id)])
}

export function useMyReports() {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, read)
}

const MESSAGE: Partial<Record<DumpStatus, (title: string) => string>> = {
  dispatched_to_government: (t) => `Your report "${t}" was sent to the municipal office.`,
  assigned_sweeper: (t) => `A crew has been assigned to "${t}".`,
  in_progress: (t) => `A crew is cleaning "${t}" now 🚛`,
  cleaned: (t) => `"${t}" has been cleaned ✅ Thanks for reporting it!`,
}

/** Compares the server's dumps with your reports and announces any status change. */
export function checkReports(dumps: DumpReport[], notify: (text: string) => void) {
  const mine = read()
  if (!mine.length) return
  let changed = false
  const next = mine.map((r) => {
    const d = dumps.find((x) => x.id === r.id)
    if (!d || d.status === r.status) return r
    changed = true
    const text = MESSAGE[d.status]?.(r.title)
    if (text) {
      notify(text)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("WasteWise", { body: text, icon: "/icons/icon-192.png", tag: `dump-${r.id}` })
        } catch {
          /* notifications from the page aren't allowed on this browser */
        }
      }
    }
    return { ...r, status: d.status }
  })
  if (changed) write(next)
}

/** Checks your reports every minute (and when you come back to the tab) while the app is open. */
export function useReportWatcher(notify: (text: string) => void) {
  useEffect(() => {
    const check = () => {
      if (!read().length || document.hidden) return
      fetch("/api/dumps")
        .then((r) => r.json())
        .then((d) => checkReports((d.dumps as DumpReport[] | undefined) ?? [], notify))
        .catch(() => {})
    }
    check()
    const t = setInterval(check, 60000)
    document.addEventListener("visibilitychange", check)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", check)
    }
  }, [notify])
}
