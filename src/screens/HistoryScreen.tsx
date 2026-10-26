import { useMemo, useState } from "react"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Mark } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { ConfirmDialog } from "@/components/ui/dialog"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { HistoryRow } from "@/components/widgets"
import { EvidenceBox, NotFoundCard, PrepSteps } from "@/components/scan-views"
import { CategoryBadge, Thumb, confidenceLabel } from "@/components/brand"
import { dayLabel } from "@/lib/dates"
import { getCategory, CATEGORIES } from "@/lib/categories"
import { mockScanStore } from "@/lib/mockScansStore"
import { useApp } from "@/state/AppContext"

export function HistoryScreen() {
  const { history, navigate, clearHistory } = useApp()
  const [filter, setFilter] = useState<string>("all")
  const [confirm, setConfirm] = useState(false)

  const groups = useMemo(() => {
    const list = filter === "all" ? history : history.filter((h) => (filter === "none" ? !h.category_id : h.category_id === filter))
    const out: { day: string; items: typeof history }[] = []
    list.forEach((h) => {
      const day = dayLabel(h.timestamp)
      const last = out[out.length - 1]
      if (last?.day === day) last.items.push(h)
      else out.push({ day, items: [h] })
    })
    return out
  }, [history, filter])

  return (
    <div className="px-4 pt-4 pb-32 lg:mx-auto lg:max-w-[960px] lg:pt-8 lg:pb-16">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" aria-label="Back to Home" onClick={() => navigate({ name: "home" })}>
            <ArrowLeft size={22} />
          </Button>
          <h1 className="display text-3xl">History</h1>
        </div>
        {history.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
            <Trash2 size={16} /> Clear history
          </Button>
        )}
      </header>

      {history.length === 0 ? (
        <div className="ww-fade-up flex flex-col items-center glass px-6 py-10 text-center">
          <span className="bg-mint grid aspect-square place-items-center overflow-hidden rounded-full p-1">
            <LuluMascot mood="idle" size={80} />
          </span>
          <p className="mt-3 text-sm text-sub">No scans yet — your sorted items will show up here.</p>
          <Button className="mt-4" onClick={() => navigate({ name: "scan" })}>Scan an item</Button>
        </div>
      ) : (
        <>
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </Chip>
            ))}
            <Chip active={filter === "none"} onClick={() => setFilter("none")}>Not sorted</Chip>
          </div>
          {groups.length === 0 && <p className="py-8 text-center text-sm text-sub">Nothing in this category yet.</p>}
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.day}>
                <h2 className="mb-2 text-sm">
                  <Mark>{g.day}</Mark>
                </h2>
                <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {g.items.map((e) => (
                    <HistoryRow key={e.id} entry={e} showTime="clock" onClick={() => navigate({ name: "historyDetail", id: e.id })} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm}
        title="Clear history?"
        body="This removes your saved scans from this device. Your earned Eco Points stay."
        confirmLabel="Clear"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          clearHistory()
          setConfirm(false)
        }}
      />
    </div>
  )
}

/** A saved result, showing the rule exactly as it was shown at the time. */
export function HistoryDetailScreen({ id }: { id: string }) {
  const { history, navigate } = useApp()
  const entry = history.find((h) => h.id === id) || mockScanStore.getScanById(id)
  if (!entry) {
    return (
      <div className="px-4 pt-6 pb-32 text-center lg:pt-12">
        <p className="text-sm text-sub">This scan is no longer in your history.</p>
        <Button className="mt-4" onClick={() => navigate({ name: "history" })}>Back to History</Button>
      </div>
    )
  }
  const snap = entry.rule_snapshot
  const category = getCategory(entry.category_id)
  const conf = confidenceLabel(entry.confidence)
  return (
    <div className="space-y-4 px-4 pt-4 pb-32 lg:mx-auto lg:max-w-[860px] lg:pt-8 lg:pb-16">
      <header className="flex items-center gap-2">
        <Button variant="secondary" size="icon" aria-label="Back to History" onClick={() => navigate({ name: "history" })}>
          <ArrowLeft size={22} />
        </Button>
        <div>
          <h1 className="display text-3xl">Saved result</h1>
          <p className="text-xs text-sub">
            {dayLabel(entry.timestamp)} · {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </header>

      <div className="ww-fade-up space-y-4 glass p-5">
        <div className="flex gap-4">
          <Thumb src={entry.thumbnail} size={88} className="rounded-[16px]" />
          <div className="min-w-0">
            <h2 className="display text-3xl leading-tight capitalize">{entry.corrected_item ?? entry.ai_item}</h2>
            {entry.ai_material && <p className="text-sm text-sub">{entry.ai_material}</p>}
            {conf && <span className="badge-mint mt-2 inline-flex px-2.5 py-1 text-[11px]">{conf}</span>}
          </div>
        </div>
        {entry.corrected_item && (
          <div className="tile px-4 py-3 text-sm">
            <p><span className="font-semibold">First identified as:</span> {entry.ai_item}</p>
            <p><span className="font-semibold">You corrected to:</span> {entry.corrected_item}</p>
          </div>
        )}
        {entry.description && <p className="text-sm"><span className="font-semibold">Your details:</span> {entry.description}</p>}
        {entry.clarifications.length > 0 && (
          <ul className="space-y-1 text-sm">
            {entry.clarifications.map((c, i) => (
              <li key={i}><span className="font-semibold">{c.question}</span> — {c.answer}</li>
            ))}
          </ul>
        )}
        {snap && category ? (
          <>
            <CategoryBadge category={{ ...category, label: snap.category_label, bin: snap.bin }} />
            <PrepSteps steps={snap.preparation} />
            <EvidenceBox ruleId={snap.rule_id} sourceText={snap.source_text} />
          </>
        ) : (
          <NotFoundCard reason="no_rule" />
        )}
        <p className="text-xs text-sub">Points earned: {entry.points_awarded}</p>
      </div>
    </div>
  )
}
