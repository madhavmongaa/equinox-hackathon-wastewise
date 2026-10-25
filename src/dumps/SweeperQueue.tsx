// Cleanup queue: send a crew to a reported dump, then close it with an after photo.
// Reworked from Kunwar's sweeper queue to use the app's own cards and colours.

import { useRef, useState } from "react"
import { Camera, CheckCircle2, MapPin, Send, Truck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BeforeAfter, StatusSteps } from "@/dumps/BeforeAfter"
import { DumpPhoto } from "@/dumps/DumpPhoto"
import { SEVERITY_COLOR } from "@/dumps/severity"
import type { DumpReport, DumpStatus } from "@/dumps/types"
import { relativeTime } from "@/lib/dates"
import { ImageError, prepareImageFile } from "@/lib/image"
import { formatKg } from "@/lib/impact"
import { cn } from "@/lib/utils"

interface SweeperQueueProps {
  dumps: DumpReport[]
  onUpdateStatus: (id: string, status: DumpStatus, assignedTeam?: string, sweeperNotes?: string, afterImageUrl?: string, recycledKg?: number) => void
  onOpenGovernmentModal: (dump: DumpReport) => void
}

type Stage = "waiting" | "working" | "cleaned"

const STAGES: { id: Stage; label: string; match: (d: DumpReport) => boolean }[] = [
  { id: "waiting", label: "Waiting", match: (d) => d.status === "reported" || d.status === "dispatched_to_government" },
  { id: "working", label: "Crew on it", match: (d) => d.status === "in_progress" || d.status === "assigned_sweeper" },
  { id: "cleaned", label: "Cleaned", match: (d) => d.status === "cleaned" },
]

const DEFAULT_CREW = "Campus Sweeper Crew A"

export function SweeperQueue({ dumps, onUpdateStatus, onOpenGovernmentModal }: SweeperQueueProps) {
  const [stage, setStage] = useState<Stage>("waiting")
  const [closing, setClosing] = useState<DumpReport | null>(null)
  const list = dumps.filter(STAGES.find((s) => s.id === stage)!.match)

  return (
    <div className="space-y-4">
      <div className="pill-glass grid grid-cols-3 p-1" role="tablist" aria-label="Cleanup stage">
        {STAGES.map((s) => {
          const n = dumps.filter(s.match).length
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={stage === s.id}
              onClick={() => setStage(s.id)}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
                stage === s.id ? "bg-mint text-green shadow-soft" : "text-sub"
              )}
            >
              {s.label}
              <span className="rounded-full bg-card px-1.5 text-[11px] tabular-nums">{n}</span>
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Truck size={28} className="text-sub" />
          <p className="font-semibold">{stage === "cleaned" ? "Nothing cleaned yet" : "Nothing here right now"}</p>
          <p className="text-sm text-sub">{stage === "waiting" ? "New dump reports show up here." : "Dumps move here as crews work on them."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <article key={d.id} className="glass flex flex-col overflow-hidden p-0">
              {d.status === "cleaned" ? (
                <BeforeAfter before={d.imageUrl} after={d.afterImageUrl} alt={d.title} className="h-44" />
              ) : (
                <div className="relative h-44 bg-mint">
                  <DumpPhoto src={d.imageUrl} alt={d.title} className="h-full w-full object-cover" />
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white capitalize">
                    <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLOR[d.severity] }} />
                    {d.severity} · {formatKg(d.estimatedWeightKg)}
                  </span>
                  {d.governmentDispatch && (
                    <span className="absolute top-2 right-2 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink shadow-soft">
                      #{d.governmentDispatch.ticketNumber}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="line-clamp-2 font-semibold leading-snug">{d.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-sub">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{d.location.address ?? "Location pinned on the map"}</span>
                  </p>
                </div>

                <StatusSteps status={d.status} />

                {d.status === "cleaned" ? (
                  <p className="tile px-3 py-2 text-xs text-sub">
                    <span className="font-semibold text-ink">{d.sweeperCrew?.assignedTeam ?? "Crew"}</span> cleared{" "}
                    {formatKg(d.sweeperCrew?.recycledKg ?? d.estimatedWeightKg)}
                    {d.sweeperCrew?.cleanedAt && ` · ${relativeTime(d.sweeperCrew.cleanedAt)}`}
                    {d.sweeperCrew?.sweeperNotes && <span className="mt-1 block">{d.sweeperCrew.sweeperNotes}</span>}
                  </p>
                ) : (
                  d.recommendedEquipment.length > 0 && <p className="line-clamp-1 text-xs text-sub">Needs: {d.recommendedEquipment.join(", ")}</p>
                )}

                {d.status !== "cleaned" && (
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    {!d.governmentDispatch && (
                      <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => onOpenGovernmentModal(d)}>
                        <Send size={14} /> Report to council
                      </Button>
                    )}
                    {stage === "waiting" ? (
                      <Button
                        size="sm"
                        className="ml-auto h-9"
                        onClick={() => onUpdateStatus(d.id, "in_progress", DEFAULT_CREW, "Crew on site, clearing the dump.")}
                      >
                        <Truck size={15} /> Send a crew
                      </Button>
                    ) : (
                      <Button size="sm" className="ml-auto h-9" onClick={() => setClosing(d)}>
                        <CheckCircle2 size={15} /> Mark cleaned
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {closing && (
        <CloseDumpSheet
          dump={closing}
          onCancel={() => setClosing(null)}
          onDone={(crew, notes, after, kg) => {
            onUpdateStatus(closing.id, "cleaned", crew, notes, after, kg)
            setClosing(null)
            setStage("cleaned")
          }}
        />
      )}
    </div>
  )
}

/** Close a dump: after photo (optional but encouraged), crew, kg recovered, notes. */
function CloseDumpSheet({
  dump,
  onCancel,
  onDone,
}: {
  dump: DumpReport
  onCancel: () => void
  onDone: (crew: string, notes: string, after: string | undefined, kg: number) => void
}) {
  const [crew, setCrew] = useState(dump.sweeperCrew?.assignedTeam ?? DEFAULT_CREW)
  const [kg, setKg] = useState(String(dump.estimatedWeightKg))
  const [notes, setNotes] = useState("")
  const [after, setAfter] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(null)
    try {
      setAfter((await prepareImageFile(file)).dataUrl)
    } catch (err) {
      setPhotoError(err instanceof ImageError ? err.message : "Couldn't read that photo. Try another one.")
    }
  }

  const kgNumber = Math.max(0, Number(kg) || 0)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-dump-title"
    >
      <div className="ww-sheet sky-sheet max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] p-5 sm:rounded-[24px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="close-dump-title" className="display text-xl">
              Mark as cleaned
            </h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-sub">{dump.title}</p>
          </div>
          <Button variant="secondary" size="icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <figure>
            <DumpPhoto src={dump.imageUrl} alt={`${dump.title}, before`} className="h-32 w-full rounded-[14px] object-cover" />
            <figcaption className="mt-1 text-xs text-sub">Before</figcaption>
          </figure>
          <figure>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "ww-press grid h-32 w-full place-items-center overflow-hidden rounded-[14px]",
                after ? "p-0" : "border-2 border-dashed border-[var(--ww-line-strong)] bg-card text-sub hover:text-green"
              )}
              aria-label={after ? "Change the after photo" : "Add an after photo"}
            >
              {after ? (
                <img src={after} alt="After cleanup" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-sm font-semibold">
                  <Camera size={22} /> Add after photo
                </span>
              )}
            </button>
            <figcaption className="mt-1 text-xs text-sub">After</figcaption>
          </figure>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        {photoError && <p className="mt-2 text-sm text-[#C0261B]">{photoError}</p>}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Crew</span>
            <input value={crew} onChange={(e) => setCrew(e.target.value)} className="field h-11 w-full px-4 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Waste recovered (kg)</span>
            <input value={kg} onChange={(e) => setKg(e.target.value)} inputMode="numeric" className="field h-11 w-full px-4 text-sm tabular-nums" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Cleared and swept, sent to the recycling centre"
              className="field w-full rounded-[16px] px-4 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onDone(crew.trim() || DEFAULT_CREW, notes.trim() || "Site cleared.", after ?? undefined, kgNumber)}>
            <CheckCircle2 size={18} /> {after ? "Close with photo" : "Close without photo"}
          </Button>
        </div>
      </div>
    </div>
  )
}
