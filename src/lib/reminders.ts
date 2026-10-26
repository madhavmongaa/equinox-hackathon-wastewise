// Pickup reminders. Without a push server, reminders come while WasteWise is open
// (or installed and running): a browser notification and a toast about an hour before
// each pickup for your team. Each pickup is announced once.

import { useEffect, useState } from "react"
import { PICKUPS, PICKUP_LABEL, type Pickup } from "@/data/pickups"

const IST = 5.5 * 3600000
const ON_KEY = "wastewise.reminders.v1"
const SENT_KEY = "wastewise.remindersSent.v1"
/** How long before a pickup the reminder fires. */
const LEAD_MS = 60 * 60 * 1000

export interface NextPickup extends Pickup {
  at: Date
}

/** The upcoming pickups for a team over the next week, soonest first. */
export function nextPickups(team: string | null | undefined, now = new Date(), limit = 4): NextPickup[] {
  const list = team ? (PICKUPS[team] ?? []) : []
  const out: NextPickup[] = []
  const ist = new Date(now.getTime() + IST)
  for (let d = 0; d < 8; d++) {
    const day = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + d))
    const dow = day.getUTCDay() || 7
    for (const p of list) {
      if (!p.days.includes(dow)) continue
      const [h, m] = p.time.split(":").map(Number)
      const at = new Date(day.getTime() + (h * 60 + m) * 60000 - IST)
      if (at.getTime() > now.getTime()) out.push({ ...p, at })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit)
}

/** "Today 8:00 AM", "Tomorrow 9:30 AM", "Sat 11:00 AM" */
export function whenLabel(at: Date, now = new Date()) {
  const day = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10)
  const time = at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
  if (day(at) === day(now)) return `Today ${time}`
  if (day(at) === day(new Date(now.getTime() + 86400000))) return `Tomorrow ${time}`
  return `${at.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })} ${time}`
}

export function remindersOn() {
  try {
    return localStorage.getItem(ON_KEY) === "1"
  } catch {
    return false
  }
}

/** Turns reminders on (asking for notification permission) or off. Returns the new state. */
export async function setReminders(on: boolean) {
  if (on && "Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission().catch(() => "denied")
  }
  try {
    localStorage.setItem(ON_KEY, on ? "1" : "0")
  } catch {
    /* storage blocked */
  }
  return on
}

/** Checks every minute while the app is open; calls `notify` for each pickup that's about to happen. */
export function useReminderTicker(team: string | null | undefined, notify: (text: string) => void) {
  useEffect(() => {
    if (!team) return
    const check = () => {
      if (!remindersOn()) return
      let sent: string[] = []
      try {
        sent = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]")
      } catch {
        /* none yet */
      }
      const now = new Date()
      for (const p of nextPickups(team, now, 6)) {
        const id = `${team}:${p.kind}:${p.at.toISOString()}`
        const until = p.at.getTime() - now.getTime()
        if (until > LEAD_MS || sent.includes(id)) continue
        const text = `${PICKUP_LABEL[p.kind]} pickup ${whenLabel(p.at, now).toLowerCase()} at ${p.where}`
        notify(text)
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("WasteWise reminder", { body: text, icon: "/icons/icon-192.png", tag: id })
          } catch {
            /* some browsers only allow notifications from a service worker */
          }
        }
        sent = [...sent.slice(-30), id]
        try {
          localStorage.setItem(SENT_KEY, JSON.stringify(sent))
        } catch {
          /* storage blocked */
        }
      }
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [team, notify])
}

/** Reminder switch state for the UI. */
export function useRemindersSetting() {
  const [on, setOn] = useState(remindersOn)
  return {
    on,
    toggle: async () => setOn(await setReminders(!on)),
    blocked: "Notification" in window && Notification.permission === "denied",
  }
}
