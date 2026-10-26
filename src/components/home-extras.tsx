import { useCallback } from "react"
import { Bell, BellOff, CalendarClock, CloudOff, Download, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { PICKUP_LABEL } from "@/data/pickups"
import { binTone } from "@/lib/binColors"
import { removeQueued, useQueuedScans } from "@/lib/offlineQueue"
import { useInstall, useOnline } from "@/lib/pwa"
import { nextPickups, useReminderTicker, useRemindersSetting, whenLabel } from "@/lib/reminders"
import { useReportWatcher } from "@/lib/myReports"
import { teamById } from "@/lib/teams"
import { uuid } from "@/lib/utils"
import { useApp } from "@/state/AppContext"
import { t, useLang } from "@/lib/i18n"

/** Next waste pickups for your area, with a reminder switch. */
export function PickupCard({ index, className }: { index?: number; className?: string }) {
  useLang()
  const { profile, navigate } = useApp()
  const team = teamById(profile?.team)
  const reminders = useRemindersSetting()
  const list = nextPickups(team?.id, new Date(), 3)
  return (
    <Card index={index} className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-green" />
          <h2 className="display text-lg">{t("Next pickups")}</h2>
        </div>
        {team && (
          <span className="badge-mint text-xs">
            {team.emoji} {team.name}
          </span>
        )}
      </div>
      {!team ? (
        <div className="tile px-4 py-4 text-sm">
          <p className="text-sub">Pick your area to see when each kind of waste is collected.</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate({ name: "profile" })}>
            Choose my area
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {list.map((p) => {
              const tone = binTone(p.kind)
              return (
                <li key={`${p.kind}${p.at.toISOString()}`} className="tile flex items-center gap-3 px-3.5 py-2.5">
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: tone.vivid }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold" style={{ color: tone.text }}>
                      {PICKUP_LABEL[p.kind]}
                    </span>
                    <span className="block truncate text-xs text-sub">{p.where}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">{whenLabel(p.at)}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              {reminders.on ? <Bell size={16} className="text-green" /> : <BellOff size={16} className="text-sub" />}
              <span>
                Remind me an hour before
                {reminders.blocked && reminders.on && (
                  <span className="block text-[11px] text-sub">Notifications are blocked, so reminders show in the app.</span>
                )}
              </span>
            </span>
            <Switch label="Remind me before pickups" checked={reminders.on} onChange={() => reminders.toggle()} />
          </div>
          <p className="mt-2 text-[11px] text-sub">Sample schedule. Reminders come while WasteWise is open.</p>
        </>
      )}
    </Card>
  )
}

/** Scans saved while offline, ready to sort once the connection is back. */
export function OfflineScansCard({ className }: { className?: string }) {
  const queued = useQueuedScans()
  const online = useOnline()
  const { navigate } = useApp()
  if (!queued.length) return null
  const first = queued[0]
  return (
    <div className={`ww-fade-up glass flex items-center gap-3 px-4 py-3 ${className ?? ""}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-green">
        <CloudOff size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {queued.length} {queued.length === 1 ? "scan" : "scans"} saved while offline
        </p>
        <p className="text-xs text-sub">{online ? "You're back online. Sort them now." : "We'll sort them when you're back online."}</p>
      </div>
      <Button
        size="sm"
        disabled={!online}
        onClick={() => {
          removeQueued(first.id)
          navigate({ name: "scan", start: { key: uuid(), image: first.image, text: first.text } })
        }}
      >
        <ScanLine size={16} /> Sort now
      </Button>
    </div>
  )
}

/** Offers to install WasteWise when the browser allows it. */
export function InstallCard({ className }: { className?: string }) {
  const { canInstall, install } = useInstall()
  const { toast } = useApp()
  if (!canInstall) return null
  return (
    <div className={`ww-fade-up glass flex items-center gap-3 px-4 py-3 ${className ?? ""}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-green">
        <Download size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install WasteWise</p>
        <p className="text-xs text-sub">Open it from your home screen, even with no signal.</p>
      </div>
      <Button size="sm" onClick={async () => (await install()) && toast("WasteWise installed 🎉", "happy")}>
        Install
      </Button>
    </div>
  )
}

/** While the app is open: pickup reminders for your team, and news about dumps you reported. */
export function ReminderTicker() {
  const { profile, toast } = useApp()
  const notify = useCallback((text: string) => toast(`⏰ ${text}`, "info"), [toast])
  useReminderTicker(profile?.team, notify)
  const dumpNotify = useCallback((text: string) => toast(text, "happy"), [toast])
  useReportWatcher(dumpNotify)
  return null
}
