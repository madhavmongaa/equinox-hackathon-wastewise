// All day/week boundaries use IST (Asia/Kolkata), so everyone shares one calendar.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function istParts(d: Date) {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), day: ist.getUTCDate() }
}

/** YYYY-MM-DD in IST */
export function istDate(d: Date = new Date()) {
  const { y, m, day } = istParts(d)
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function istYesterday(d: Date = new Date()) {
  return istDate(new Date(d.getTime() - 24 * 60 * 60 * 1000))
}

/** ISO week id in IST, e.g. "2026-W43" (weeks start Monday 00:00 IST). */
export function istWeekId(d: Date = new Date()) {
  const { y, m, day } = istParts(d)
  const date = new Date(Date.UTC(y, m, day))
  const dow = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dow)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

export function dayLabel(iso: string) {
  const key = istDate(new Date(iso))
  if (key === istDate()) return "Today"
  if (key === istYesterday()) return "Yesterday"
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h ago`
  return dayLabel(iso)
}
