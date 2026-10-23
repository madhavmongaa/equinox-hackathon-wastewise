// Result / clarification / not-found / error views, shared by the Scan screen and Lulu's chat cards.

import { useEffect, useMemo, useState } from "react"
import { Camera, Check, ChevronDown, CircleCheck, Pencil, RefreshCw, ScanLine, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Mark } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { Sheet } from "@/components/ui/sheet"
import { CategoryBadge, Thumb, categoryIcon, confidenceLabel } from "@/components/brand"
import { SegmentedPhoto } from "@/components/segmented-photo"
import { AI_RULE_ID, guide, ruleLabel, suggestionItems } from "@/lib/guide"
import { binTone, shadeFor, type BinTone } from "@/lib/binColors"
import { cropThumbnail } from "@/lib/segment"
import type { Category, MultiPart, Outcome, Rule, RuleSnapshot, ScanAI } from "@/lib/types"
import { cn } from "@/lib/utils"

// ---------- analysis ----------

export const ANALYSIS_STEPS = ["Identifying item…", "Checking campus waste guide…", "Preparing your answer…"]

/** Steps tick off in order while the request runs. */
export function useAnalysisStep(active: boolean) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!active) return
    setStep(0)
    const t1 = setTimeout(() => setStep(1), 1300)
    const t2 = setTimeout(() => setStep(2), 2700)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [active])
  return step
}

export function AnalysisView({ thumbnail }: { thumbnail: string | null }) {
  const step = useAnalysisStep(true)
  return (
    <div className="ww-fade-up flex flex-col items-center px-2 pt-6 text-center" aria-live="polite">
      <span className="bg-mint grid aspect-square place-items-center overflow-hidden rounded-full p-2"><LuluMascot mood="thinking" size={120} /></span>
      <h2 className="display mt-4 text-4xl">Lulu is on it</h2>
      {thumbnail && <Thumb src={thumbnail} size={64} className="mt-3 rounded-[14px]" />}
      <ol className="mt-6 w-full max-w-[300px] space-y-3 text-left">
        {ANALYSIS_STEPS.map((label, i) => {
          const done = i < step
          const current = i === step
          return (
            <li key={label} className={cn("glass flex items-center gap-3 rounded-full px-4 py-3 transition-opacity", !done && !current && "opacity-55")}>
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", done ? "bg-green text-white" : "bg-mint text-green")}>
                {done ? <Check size={16} strokeWidth={3} /> : <span className={cn("h-2 w-2 rounded-full bg-white", current && "ww-dot")} />}
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ---------- clarification ----------

interface ClarifyProps {
  ai: ScanAI
  question: string
  options: string[]
  thumbnail: string | null
  onAnswer: (answer: string) => void
  onRetakePhoto?: () => void
  compact?: boolean
  disabled?: boolean
}

export function ClarificationCard({ ai, question, options, thumbnail, onAnswer, onRetakePhoto, compact, disabled }: ClarifyProps) {
  const [other, setOther] = useState("")
  const [showOther, setShowOther] = useState(false)
  return (
    <div className={cn("ww-fade-up glass", compact ? "p-4" : "p-5")}>
      <div className="flex items-start gap-3">
        <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1"><LuluMascot mood="confused" size={compact ? 44 : 64} /></span>
        <div className="min-w-0">
          <Mark className="text-xs">Quick question before I answer</Mark>
          <div className="mt-2 flex items-center gap-2">
            {thumbnail && <Thumb src={thumbnail} size={36} className="rounded-[10px]" />}
            <p className="text-sm text-sub">
              This might be: <span className="font-semibold text-ink">{ai.item}</span>
            </p>
          </div>
        </div>
      </div>
      <p className={cn("display mt-3", compact ? "text-xl" : "text-[26px] leading-tight")}>{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} disabled={disabled} onClick={() => onAnswer(o)}>
            {o}
          </Chip>
        ))}
        <Chip disabled={disabled} active={showOther} onClick={() => setShowOther((v) => !v)}>
          Other
        </Chip>
        {onRetakePhoto && (
          <Chip disabled={disabled} onClick={onRetakePhoto}>
            <Camera size={15} /> Take a clearer photo
          </Chip>
        )}
      </div>
      {showOther && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (other.trim()) onAnswer(other.trim())
          }}
        >
          <input
            autoFocus
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Type your answer…"
            className="field h-11 min-w-0 flex-1 px-4 text-sm"
          />
          <Button type="submit" size="icon" aria-label="Send answer" disabled={disabled || !other.trim()}>
            <Send size={18} />
          </Button>
        </form>
      )}
    </div>
  )
}

// ---------- result ----------

export function EvidenceBox({ ruleId, sourceText, compact }: { ruleId: string; sourceText: string; compact?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="tile">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-left text-sm font-bold text-ink"
        aria-expanded={open}
      >
        Why this answer
        <ChevronDown size={18} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn("px-4 pb-4", compact && "pb-3")}>
          {ruleId === AI_RULE_ID ? (
            <p className="text-sm leading-relaxed text-ink">{sourceText}</p>
          ) : (
            <blockquote className="border-l-4 border-green pl-3 text-sm leading-relaxed text-ink">“{sourceText}”</blockquote>
          )}
          <Mark className="mt-2 text-[11px]">{ruleLabel(ruleId)}</Mark>
        </div>
      )}
    </div>
  )
}

export function PrepSteps({ steps, compact }: { steps: string[]; compact?: boolean }) {
  if (!steps.length) return null
  return (
    <div>
      <h3 className={cn("mb-2 text-ink", compact ? "text-sm" : "text-[15px]")}>How to prepare it</h3>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-green">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

interface ResultProps {
  ai: ScanAI | null
  rule: Rule | RuleSnapshot
  category: Category
  image: string | null
  corrected?: boolean
  itemName?: string
  compact?: boolean
  actions?: React.ReactNode
}

export function ResultCard({ ai, rule, category, image, corrected, itemName, compact, actions }: ResultProps) {
  const conf = confidenceLabel(ai?.confidence)
  const steps = "preparation" in rule ? rule.preparation : []
  return (
    <div className={cn("ww-fade-up glass space-y-4", compact ? "p-4" : "p-5")}>
      <div className="flex gap-4">
        {image ? (
          <img src={image} alt="" className={cn("shrink-0 rotate-[-4deg] rounded-[12px] border-[5px] border-white object-cover shadow-soft", compact ? "h-16 w-16" : "h-24 w-24")} />
        ) : (
          <Thumb src={null} size={compact ? 64 : 96} className="rounded-[16px]" />
        )}
        <div className="min-w-0 flex-1">
          {corrected && (
            <Mark className="mb-1.5 gap-1 text-[11px]">
              <Pencil size={11} /> Corrected by you
            </Mark>
          )}
          <h2 className={cn("display leading-tight capitalize", compact ? "text-xl" : "text-3xl")}>{itemName ?? ai?.item}</h2>
          {ai?.material && <p className="mt-0.5 text-sm text-sub">{ai.material}</p>}
          {conf && (
            <span className="badge-mint mt-2 inline-flex px-2.5 py-1 text-[11px]">{conf}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <CategoryBadge category={category} compact={compact} />
        </div>
        {!compact && (
          <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1">
            <LuluMascot mood="happy" size={60} />
          </span>
        )}
      </div>

      <div className={cn("space-y-4", !compact && "lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0")}>
        <PrepSteps steps={steps} compact={compact} />
        <EvidenceBox ruleId={rule.rule_id} sourceText={rule.source_text} compact={compact} />
      </div>
      {actions}
    </div>
  )
}

export function NotFoundCard({ item, reason, compact, actions }: { item?: string | null; reason: "no_rule" | "unclear"; compact?: boolean; actions?: React.ReactNode }) {
  return (
    <div className={cn("ww-fade-up glass", compact ? "p-4" : "p-5")}>
      <div className="flex items-start gap-3">
        <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1"><LuluMascot mood="sorry" size={compact ? 44 : 64} /></span>
        <div>
          <h2 className={cn("display leading-tight", compact ? "text-xl" : "text-[26px]")}>Local disposal rule not found</h2>
          {item && (
            <p className="mt-1 text-sm text-sub">
              Item: <span className="font-semibold capitalize">{item}</span>
            </p>
          )}
        </div>
      </div>
      <p className="tile mt-3 px-4 py-3 text-sm leading-relaxed text-ink">
        {reason === "unclear"
          ? "I couldn't tell for sure what this is, so I won't guess. Try a clearer photo, or ask the campus housekeeping/sustainability team."
          : "The campus guide doesn't list this item. You can ask the campus housekeeping/sustainability team."}
      </p>
      {actions}
    </div>
  )
}

export function ErrorCard({ onRetry, message, compact }: { onRetry: () => void; message?: string; compact?: boolean }) {
  return (
    <div className={cn("ww-fade-up glass", compact ? "p-4" : "p-5")} role="alert">
      <div className="flex items-start gap-3">
        <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1"><LuluMascot mood="sorry" size={compact ? 44 : 64} /></span>
        <div>
          <h2 className={cn("display", compact ? "text-xl" : "text-[26px]")}>Something went wrong</h2>
          <p className="mt-1 text-sm text-sub">{message ?? "Couldn't reach the AI right now. Check your connection and try again."}</p>
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={onRetry}>
        <RefreshCw size={18} /> Retry
      </Button>
    </div>
  )
}

export function ResultActions({
  onCorrect,
  onGotIt,
  onScanAnother,
  onScanAgain,
  saved,
  busy,
  compact,
}: {
  onCorrect?: () => void
  onGotIt: () => void
  onScanAnother?: () => void
  onScanAgain?: () => void
  saved?: boolean
  busy?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn("grid gap-2", compact ? "mt-1 grid-cols-2" : "mt-2 sm:grid-cols-2 lg:grid-cols-4")}>
      {onScanAgain && (
        <Button onClick={onScanAgain} disabled={busy} size={compact ? "sm" : "lg"} className="bg-green hover:bg-green-2 text-white">
          <Camera size={18} /> Scan Again
        </Button>
      )}
      <Button onClick={onGotIt} disabled={saved || busy} variant={onScanAgain ? "outline" : "primary"} className={compact && !onScanAgain ? "col-span-2" : ""} size={compact ? "sm" : "lg"}>
        <CircleCheck size={18} /> {saved ? "Saved" : "Done"}
      </Button>
      {onCorrect && !saved && (
        <Button variant="outline" onClick={onCorrect} disabled={busy} size={compact ? "sm" : "md"}>
          <Pencil size={16} /> That's not right
        </Button>
      )}
      {onScanAnother && (
        <Button variant="ghost" onClick={onScanAnother} size={compact ? "sm" : "md"}>
          <ScanLine size={16} /> Pick / Describe
        </Button>
      )}
    </div>
  )
}

export function OutcomeView({
  outcome,
  image,
  corrected,
  compact,
  actions,
}: {
  outcome: Extract<Outcome, { kind: "result" | "not_found" | "multi" }>
  image: string | null
  corrected?: boolean
  compact?: boolean
  actions?: React.ReactNode
}) {
  if (outcome.kind === "multi") {
    return <MultiResultView parts={outcome.parts} image={image} compact={compact} actions={actions} />
  }
  if (outcome.kind === "result") {
    return <ResultCard ai={outcome.ai} rule={outcome.rule} category={outcome.category} image={image} corrected={corrected} compact={compact} actions={actions} />
  }
  return <NotFoundCard item={outcome.ai?.item} reason={outcome.reason} compact={compact} actions={actions} />
}

// ---------- multi-item ----------

/** Per-item thumbnails cut from the photo, in part order (null until ready or without a box). */
export function usePartCrops(image: string | null, parts: MultiPart[]) {
  const [crops, setCrops] = useState<(string | null)[]>([])
  useEffect(() => {
    let alive = true
    setCrops([])
    if (!image) return
    Promise.all(parts.map((p) => (p.box ? cropThumbnail(image, p.box).catch(() => null) : null))).then((c) => alive && setCrops(c))
    return () => {
      alive = false
    }
  }, [image, parts])
  return crops
}

interface ColoredPart {
  part: MultiPart
  /** index into parts */
  index: number
  categoryId: string | null
  tone: BinTone
  /** this item's own shade of its bin colour */
  color: string
}

interface BinGroup {
  key: string
  label: string
  bin: string
  tone: BinTone
  items: ColoredPart[]
}

function colourParts(parts: MultiPart[]): ColoredPart[] {
  const seen = new Map<string, number>()
  return parts.map((part, index) => {
    const categoryId = part.outcome.kind === "result" ? part.outcome.category.id : null
    const key = categoryId ?? "unsorted"
    const k = seen.get(key) ?? 0
    seen.set(key, k + 1)
    const tone = binTone(categoryId)
    return { part, index, categoryId, tone, color: shadeFor(tone.vivid, k) }
  })
}

function groupByBin(colored: ColoredPart[]): BinGroup[] {
  const groups = new Map<string, BinGroup>()
  for (const cp of colored) {
    const cat = cp.part.outcome.kind === "result" ? cp.part.outcome.category : null
    const key = cat?.id ?? "unsorted"
    if (!groups.has(key)) {
      groups.set(key, { key, label: cat?.label ?? "Not sorted", bin: cat?.bin ?? "Ask campus housekeeping", tone: cp.tone, items: [] })
    }
    groups.get(key)!.items.push(cp)
  }
  const order = [...guide.categories.map((c) => c.id), "unsorted"]
  return [...groups.values()].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
}

/** Two or more items in one scan: a summary, the spotlit photo, and the items grouped by bin. */
export function MultiResultView({ parts, image, compact, actions }: { parts: MultiPart[]; image: string | null; compact?: boolean; actions?: React.ReactNode }) {
  const [active, setActive] = useState<number | null>(null)
  const colored = useMemo(() => colourParts(parts), [parts])
  const groups = useMemo(() => groupByBin(colored), [colored])
  const crops = usePartCrops(image, parts)
  const bins = groups.filter((g) => g.key !== "unsorted").length
  const hasPhoto = !!image && parts.some((p) => p.box)

  const select = (i: number | null, fromPhoto = false) => {
    setActive(i)
    if (fromPhoto && i !== null) {
      requestAnimationFrame(() => document.getElementById(`multi-item-${i}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }))
    }
  }

  return (
    <div className="ww-fade-up space-y-4">
      <section className={cn("glass", compact ? "space-y-3 p-4" : "space-y-4 p-5")}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Mixed waste</p>
            <h2 className={cn("display leading-tight", compact ? "text-2xl" : "text-[34px]")}>
              {parts.length} items, {bins} {bins === 1 ? "bin" : "bins"}
            </h2>
            <p className="mt-0.5 text-sm text-sub">{hasPhoto ? "Tap an item on the photo or in the list to see where it goes." : "Tap an item to see where it goes."}</p>
          </div>
          <span className="hidden shrink-0 overflow-hidden rounded-full bg-mint p-1 sm:grid">
            <LuluMascot mood="happy" size={compact ? 44 : 56} />
          </span>
        </div>
        <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full" aria-hidden>
          {groups.map((g) => (
            <span key={g.key} className="h-full rounded-full" style={{ flexGrow: g.items.length, backgroundColor: g.tone.vivid }} />
          ))}
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Bins in this scan">
          {groups.map((g) => {
            const Icon = categoryIcon(g.key)
            return (
              <li key={g.key} className="inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-2.5 text-xs font-semibold" style={{ backgroundColor: g.tone.soft, color: g.tone.deep }}>
                <Icon size={14} aria-hidden />
                {g.label}
                <span className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white" style={{ backgroundColor: g.tone.deep }}>
                  {g.items.length}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className={cn("space-y-4", !compact && hasPhoto && "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0")}>
        {hasPhoto && (
          <div className="lg:sticky lg:top-24">
            <SegmentedPhoto
              src={image!}
              active={active}
              onSelect={(i) => select(i, true)}
              parts={colored.map((cp) => ({
                box: cp.part.box,
                color: cp.color,
                tagColor: cp.tone.deep,
                categoryId: cp.categoryId,
                n: cp.index + 1,
                label: cp.part.ai.item,
              }))}
            />
          </div>
        )}
        <div className="space-y-3">
          {groups.map((g) => (
            <BinGroupCard key={g.key} group={g} crops={crops} active={active} onToggle={(i) => select(active === i ? null : i)} />
          ))}
        </div>
      </div>
      {actions && <div className={cn("glass", compact ? "p-4" : "p-5")}>{actions}</div>}
    </div>
  )
}

function BinGroupCard({ group, crops, active, onToggle }: { group: BinGroup; crops: (string | null)[]; active: number | null; onToggle: (index: number) => void }) {
  const Icon = categoryIcon(group.key)
  const { tone } = group
  return (
    <section className="glass overflow-hidden p-0">
      <header className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: tone.soft }}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-soft" style={{ backgroundColor: tone.deep }}>
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="leading-tight font-bold" style={{ color: tone.deep }}>
            {group.label}
          </h3>
          <p className="text-xs text-sub">{group.bin}</p>
        </div>
        <span className="text-xs font-semibold" style={{ color: tone.deep }}>
          {group.items.length} {group.items.length === 1 ? "item" : "items"}
        </span>
      </header>
      <ul>
        {group.items.map((cp) => (
          <ItemRow key={cp.index} cp={cp} crop={crops[cp.index] ?? null} open={active === cp.index} onToggle={() => onToggle(cp.index)} />
        ))}
      </ul>
    </section>
  )
}

function ItemRow({ cp, crop, open, onToggle }: { cp: ColoredPart; crop: string | null; open: boolean; onToggle: () => void }) {
  const { part, tone, color } = cp
  const outcome = part.outcome
  const ruleId = outcome.kind === "result" ? outcome.rule.rule_id : null
  return (
    <li id={`multi-item-${cp.index}`} className="relative scroll-mt-24 border-t border-black/[0.06]">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1 transition-opacity", open ? "opacity-100" : "opacity-0")} style={{ backgroundColor: color }} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.025]"
        style={open ? { backgroundColor: tone.soft + "99" } : undefined}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold"
          style={{ color: tone.deep, boxShadow: `inset 0 0 0 3px ${color}` }}
        >
          {cp.index + 1}
        </span>
        <span className="shrink-0 rounded-[13px] p-[2px]" style={{ backgroundColor: color }}>
          <Thumb src={crop} size={48} className="rounded-[11px] bg-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold capitalize text-ink">{part.ai.item}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-sub">
            {part.ai.material && <span className="truncate">{part.ai.material}</span>}
            {ruleId &&
              (ruleId === AI_RULE_ID ? (
                <span className="rounded-full bg-[#FFF4DE] px-2 py-0.5 text-[10px] font-bold text-[#8A5300]">AI-suggested</span>
              ) : (
                <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-green">Guide §{ruleId}</span>
              ))}
          </span>
        </span>
        <ChevronDown size={18} className={cn("shrink-0 text-sub transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="ww-fade-up space-y-3 px-4 pb-4 sm:pl-[60px]">
          {outcome.kind === "result" ? (
            <>
              <PrepSteps steps={outcome.rule.preparation} compact />
              <EvidenceBox ruleId={outcome.rule.rule_id} sourceText={outcome.rule.source_text} compact />
            </>
          ) : (
            <p className="tile px-4 py-3 text-sm text-ink">No disposal rule for this one. Ask the campus housekeeping/sustainability team.</p>
          )}
        </div>
      )}
    </li>
  )
}

// ---------- correction ----------

export function CorrectionSheet({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (item: string) => void }) {
  const [value, setValue] = useState("")
  useEffect(() => {
    if (open) setValue("")
  }, [open])
  const chips = suggestionItems.slice(0, 12)
  return (
    <Sheet open={open} onClose={onClose} title="What is this item actually?" labelledBy="correction-title">
      <form
        className="space-y-4 overflow-y-auto px-5 pb-8"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onSubmit(value.trim())
        }}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. milk carton"
          className="field h-12 w-full px-5 text-[15px]"
        />
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Chip key={c} active={value === c} onClick={() => setValue(c)} className="capitalize">
              {c}
            </Chip>
          ))}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!value.trim()}>
          Update answer
        </Button>
      </form>
    </Sheet>
  )
}
