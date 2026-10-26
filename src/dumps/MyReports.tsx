import { useState } from "react"
import { Bell, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusSteps } from "@/dumps/BeforeAfter"
import type { DumpReport } from "@/dumps/types"
import { relativeTime } from "@/lib/dates"
import { useMyReports } from "@/lib/myReports"

/** Dumps you reported from this device, with live status and an alerts switch. */
export function MyReports({ dumps }: { dumps: DumpReport[] }) {
  const mine = useMyReports()
  const [permission, setPermission] = useState(() => ("Notification" in window ? Notification.permission : "denied"))
  if (!mine.length) return null
  return (
    <section className="glass p-4" aria-label="Your reports">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="display text-lg">Your reports</h2>
          <p className="text-xs text-sub">We'll tell you when a crew is on it and when it's cleaned.</p>
        </div>
        {permission === "default" ? (
          <Button size="sm" variant="secondary" onClick={async () => setPermission(await Notification.requestPermission())}>
            <Bell size={15} /> Turn on alerts
          </Button>
        ) : permission === "granted" ? (
          <span className="badge-mint text-xs">
            <BellRing size={13} /> Alerts on
          </span>
        ) : null}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {mine.slice(0, 4).map((r) => {
          const live = dumps.find((d) => d.id === r.id)
          return (
            <li key={r.id} className="tile px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{r.title}</span>
                <span className="shrink-0 text-[11px] text-sub">{relativeTime(r.reportedAt)}</span>
              </div>
              <StatusSteps status={live?.status ?? r.status} className="mt-2" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
