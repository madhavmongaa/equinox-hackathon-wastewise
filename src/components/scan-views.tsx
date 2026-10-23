// Result / clarification / not-found / error views, shared by the Scan screen and Lulu's chat cards.

import { useEffect, useState } from "react"
import { Camera, Check, ChevronDown, CircleCheck, Pencil, RefreshCw, ScanLine, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Mark } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { Sheet } from "@/components/ui/sheet"
import { CategoryBadge, Thumb, confidenceLabel } from "@/components/brand"
import { AI_RULE_ID, ruleLabel, suggestionItems } from "@/lib/guide"
import type { Category, Outcome, Rule, RuleSnapshot, ScanAI } from "@/lib/types"
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
  outcome: Extract<Outcome, { kind: "result" | "not_found" }>
  image: string | null
  corrected?: boolean
  compact?: boolean
  actions?: React.ReactNode
}) {
  if (outcome.kind === "result") {
    return <ResultCard ai={outcome.ai} rule={outcome.rule} category={outcome.category} image={image} corrected={corrected} compact={compact} actions={actions} />
  }
  return <NotFoundCard item={outcome.ai?.item} reason={outcome.reason} compact={compact} actions={actions} />
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
