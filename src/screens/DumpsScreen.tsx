// Dumps: citizen reports of illegal roadside dumps, the sweeper density heatmap,
// government dispatch and the sweeper queue. Built by Kunwar Juneja as a separate
// app on the main branch; this screen hosts it inside WasteWise.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Camera, Map as MapIcon, ScanLine, Send, Truck } from "lucide-react"
import { EarthGlobe } from "@/components/earth-globe"
import type { GlobeMarker } from "@/components/ui/3d-globe"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/motion"
import { GovernmentRegistry } from "@/dumps/GovernmentRegistry"
import { GovernmentReportModal } from "@/dumps/GovernmentReportModal"
import { HeatmapView } from "@/dumps/HeatmapView"
import { SnapReportModal } from "@/dumps/SnapReportModal"
import { SweeperQueue } from "@/dumps/SweeperQueue"
import { CleanupSummary } from "@/dumps/CleanupSummary"
import { SEVERITY_COLOR } from "@/dumps/severity"
import type { DumpReport, DumpStatus } from "@/dumps/types"
import { logActivity } from "@/lib/activity"
import { checkReports, rememberReport } from "@/lib/myReports"
import { MyReports } from "@/dumps/MyReports"
import { POINTS } from "@/lib/points"
import { cn, prefersReducedMotion } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

type Tab = "heatmap" | "government" | "sweeper"

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "heatmap", label: "Heatmap", icon: MapIcon },
  { id: "government", label: "Gov dispatch", icon: Send },
  { id: "sweeper", label: "Cleanup queue", icon: Truck },
]

export function DumpsScreen({ dumpId }: { dumpId?: string }) {
  const { toast, navigate, awardBonus } = useApp()
  const [tab, setTab] = useState<Tab>("heatmap")
  const [dumps, setDumps] = useState<DumpReport[]>([])
  const [loading, setLoading] = useState(true)
  const [snapOpen, setSnapOpen] = useState(false)
  const [govOpen, setGovOpen] = useState(false)
  const [govDump, setGovDump] = useState<DumpReport | null>(null)
  const [intro, setIntro] = useState<"flying" | "leaving" | null>(() => (shouldFlyIn(dumpId) ? "flying" : null))

  const fetchDumps = useCallback(async () => {
    try {
      const res = await fetch("/api/dumps")
      const data = await res.json()
      if (data.success && data.dumps) setDumps(data.dumps)
    } catch (err) {
      console.error("Error fetching dumps:", err)
      toast("Couldn't load dump reports. Check the server is running.", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDumps()
  }, [fetchDumps])

  const openGov = (dump: DumpReport) => {
    setGovDump(dump)
    setGovOpen(true)
  }

  const onReportCreated = (dump: DumpReport, dispatchNow = false) => {
    setDumps((prev) => [dump, ...prev])
    toast(`"${dump.title}" reported and added to the heatmap`, "happy")
    logActivity("dump_report")
    rememberReport(dump)
    // a moment later, so the two toasts don't land on top of each other
    setTimeout(() => awardBonus({ amount: POINTS.dumpReport, stats: { dumpsReported: 1 } }, "Reported a dump"), 900)
    if (dispatchNow) openGov(dump)
  }

  const onGovSuccess = (updated: DumpReport) => {
    setDumps((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    toast(`Ticket #${updated.governmentDispatch?.ticketNumber} sent to the municipal body`, "happy")
  }

  const updateStatus = async (id: string, status: DumpStatus, assignedTeam?: string, sweeperNotes?: string, afterImageUrl?: string, recycledKg?: number) => {
    try {
      const res = await fetch(`/api/dumps/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assignedTeam, sweeperNotes, afterImageUrl, recycledKg }),
      })
      const data = await res.json()
      if (data.success && data.dump) {
        setDumps((prev) => prev.map((d) => (d.id === id ? data.dump : d)))
        checkReports([data.dump], (text) => setTimeout(() => toast(text, "happy"), 1200))
        toast(status === "cleaned" ? "Dump marked as cleaned ✅" : status === "in_progress" ? "Crew sent 🚛" : `Marked as ${status.replace(/_/g, " ")}`, "info")
      }
    } catch (err) {
      console.error("Failed to update status:", err)
      toast("Couldn't update the sweeper status.", "error")
    }
  }

  // fly-in: from space down to the dump picked on the globe, or the middle of the active ones
  const target = useMemo(() => {
    const pick = dumps.find((d) => d.id === dumpId)
    const pool = pick ? [pick] : dumps.filter((d) => d.status !== "cleaned")
    if (!pool.length) return null
    const lat = pool.reduce((n, d) => n + d.location.lat, 0) / pool.length
    const lng = pool.reduce((n, d) => n + d.location.lng, 0) / pool.length
    return { lat, lng, distance: 1.45, place: pick?.location.address ?? `${pool.length} active dumps` }
  }, [dumps, dumpId])
  const introMarkers = useMemo<GlobeMarker[]>(
    () => dumps.filter((d) => d.status !== "cleaned").map((d) => ({ lat: d.location.lat, lng: d.location.lng, // pin heads grow as the camera closes in, so start them tiny
      color: SEVERITY_COLOR[d.severity], size: 1.2, id: d.id })),
    [dumps]
  )
  const endIntro = useCallback(() => {
    setIntro((s) => (s === "flying" ? "leaving" : s))
    setTimeout(() => setIntro(null), 600)
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(FLEW_KEY, "1")
    } catch {
      /* storage blocked */
    }
  }, [])

  // never keep the map hidden for long (slow globe textures, no dumps)
  useEffect(() => {
    if (!intro) return
    const t = setTimeout(endIntro, loading ? 7000 : target ? 5000 : 800)
    return () => clearTimeout(t)
  }, [intro, loading, target, endIntro])

  return (
    <div className="dumps-scope space-y-4 px-4 pt-4 pb-32 lg:pt-8 lg:pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Community cleanup</p>
          <h1 className="display text-3xl lg:text-[40px]">Illegal dumps</h1>
          <p className="mt-0.5 text-sm text-sub">
            Report roadside dumps, see hotspots and track cleanup. Each report earns {POINTS.dumpReport} points.
          </p>
        </div>
        <Button onClick={() => setSnapOpen(true)}>
          <Camera size={18} /> Report a dump
        </Button>
      </header>

      {!loading && <CleanupSummary dumps={dumps} onOpenQueue={() => setTab("sweeper")} />}
      {!loading && <MyReports dumps={dumps} />}

      <div role="tablist" aria-label="Dumps views" className="no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("ww-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold", tab === id ? "pill" : "pill-glass text-green")}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading dump reports">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[62px] rounded-[20px]" />
            ))}
          </div>
          <Skeleton className="h-[420px] rounded-[20px]" />
        </div>
      ) : (
        <>
          {tab === "heatmap" && (
            <div className="glass relative h-[780px] overflow-hidden p-0 lg:h-[calc(100dvh-16rem)] lg:min-h-[580px]">
              {intro && (
                <div
                  className={cn(
                    "absolute inset-0 z-20 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_45%,#123524_0%,#06140d_70%)] transition-opacity duration-500",
                    intro === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
                  )}
                >
                  <EarthGlobe
                    className="absolute inset-0 h-full"
                    closeUp
                    still
                    markers={introMarkers}
                    label="Globe zooming in to the reported dumps"
                    focus={target}
                    onFocusArrive={endIntro}
                  />
                  <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-4 text-center">
                    <p className="text-sm font-semibold text-white/90">{target ? `Flying to ${target.place}…` : "Finding reported dumps…"}</p>
                    <button onClick={endIntro} className="ww-press rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25">
                      Skip
                    </button>
                  </div>
                </div>
              )}
              <HeatmapView
                dumps={dumps}
                onSelectDump={(d) => setGovDump(d)}
                onOpenGovernmentModal={openGov}
                onOpenSnapModal={() => setSnapOpen(true)}
                onUpdateStatus={updateStatus}
                onRefreshDumps={fetchDumps}
                focusDumpId={dumpId}
              />
            </div>
          )}
          {tab === "government" && <GovernmentRegistry dumps={dumps} onOpenGovernmentModal={openGov} onOpenSnapModal={() => setSnapOpen(true)} />}
          {tab === "sweeper" && <SweeperQueue dumps={dumps} onUpdateStatus={updateStatus} onOpenGovernmentModal={openGov} />}
        </>
      )}

      <button onClick={() => navigate({ name: "scan" })} className="ww-press glass flex w-full items-center gap-3 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-green">
          <ScanLine size={20} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink">Sorting a single item?</span>
          <span className="block text-sm text-sub">Scan it to see which bin it goes in.</span>
        </span>
      </button>

      {/* mounted only while open, so each report starts with a fresh form */}
      {snapOpen && <SnapReportModal isOpen onClose={() => setSnapOpen(false)} onReportCreated={onReportCreated} />}
      <GovernmentReportModal
        dump={govDump}
        isOpen={govOpen}
        onClose={() => {
          setGovOpen(false)
          setGovDump(null)
        }}
        onReportSuccess={onGovSuccess}
      />
    </div>
  )
}

const FLEW_KEY = "wastewise.dumpsFlyIn.v1"

/** Fly in when opened from a globe pin, otherwise once per browser session; never with reduced motion. */
function shouldFlyIn(dumpId?: string) {
  if (prefersReducedMotion()) return false
  if (dumpId) return true
  try {
    return !sessionStorage.getItem(FLEW_KEY)
  } catch {
    return true
  }
}
