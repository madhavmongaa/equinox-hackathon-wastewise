import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IdentifyCard } from "@/components/identify-card"
import { AnalysisView, ClarificationCard, CorrectionSheet, ErrorCard, OutcomeView, ResultActions } from "@/components/scan-views"
import { AIError } from "@/lib/gemini"
import { runIdentification } from "@/lib/flow"
import { playScanSuccessSound } from "@/lib/sound"
import type { ImageInput, Outcome, ScanAI, ScanInput } from "@/lib/types"
import { MicButton, useVoiceInput } from "@/components/voice"
import { consumeVoiceTurn, outcomeSpeech, speak, stopSpeaking } from "@/lib/voice"
import { useApp, type ScanStart } from "@/state/AppContext"
import { useCapture } from "@/state/capture"

type Stage = "pick" | "preview" | "analyzing" | "clarify" | "result" | "error"

const emptyInput = (image: ImageInput | null = null, description = ""): ScanInput => ({ image, description, clarifications: [] })

export function errorMessage(err: unknown) {
  if (err instanceof AIError && err.kind === "not_configured") {
    return "Gemini isn't set up yet — add VITE_GEMINI_API_KEY to .env.local and restart the app."
  }
  return "Couldn't reach the AI right now. Check your connection and try again."
}

export function ScanScreen({ start }: { start?: ScanStart }) {
  const { navigate, finishScan } = useApp()
  const capture = useCapture()
  const [stage, setStage] = useState<Stage>("pick")
  const [input, setInput] = useState<ScanInput>(emptyInput())
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [originalAi, setOriginalAi] = useState<ScanAI | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [correcting, setCorrecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const runId = useRef(0)

  const run = useCallback(async (next: ScanInput) => {
    const id = ++runId.current
    const spoken = consumeVoiceTurn()
    stopSpeaking()
    setInput(next)
    setStage("analyzing")
    setError(null)
    const started = Date.now()
    try {
      const out = await runIdentification(next)
      // keep the analysis steps on screen long enough to read
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))))
      if (id !== runId.current) return
      setOutcome(out)
      // the AI's own identification (after any clarifications), kept separately from a correction
      if (!next.correctedItem && out.ai) setOriginalAi(out.ai)
      if (out.kind === "result" || out.kind === "multi") playScanSuccessSound()
      // asked by voice, answered by voice (same keys as the cards' Listen buttons)
      if (spoken) speak(outcomeSpeech(out), out.kind === "multi" ? "multi" : out.kind === "result" ? "result" : "scan")
      setStage(out.kind === "clarify" ? "clarify" : "result")
    } catch (err) {
      if (id !== runId.current) return
      setError(errorMessage(err))
      setStage("error")
    }
  }, [])

  // stop reading aloud when leaving the scan screen
  useEffect(() => stopSpeaking, [])

  const detailsMic = useVoiceInput({
    onInterim: (t) => setInput((p) => ({ ...p, description: t })),
    onFinal: (t) => setInput((p) => ({ ...p, description: t })),
  })

  const reset = useCallback(() => {
    stopSpeaking()
    runId.current++
    setInput(emptyInput())
    setOutcome(null)
    setOriginalAi(null)
    setStage("pick")
  }, [])

  // Start from Home / the Scan tab (once per start, so a request is never sent twice)
  const startedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!start || startedKey.current === start.key) return
    startedKey.current = start.key
    setOriginalAi(null)
    if (start.image) {
      setInput(emptyInput(start.image))
      setStage("preview")
    } else if (start.text) {
      run(emptyInput(null, start.text))
    }
  }, [start, run])

  const retake = async () => {
    const img = await capture("camera")
    if (img) {
      setInput((prev) => ({ ...prev, image: img, clarifications: [], correctedItem: undefined }))
      setOriginalAi(null)
      setStage("preview")
    }
  }

  const scanAgain = async () => {
    if (outcome && outcome.kind !== "clarify" && !saving) {
      setSaving(true)
      try {
        await finishScan({ input, outcome, originalAi })
      } catch (err) {
        console.warn("Auto-save before scanning again:", err)
      }
      setSaving(false)
    }

    const img = await capture("camera")
    if (img) {
      setInput(emptyInput(img))
      setOutcome(null)
      setOriginalAi(null)
      setError(null)
      setStage("preview")
    }
  }

  const gotIt = async () => {
    if (!outcome || outcome.kind === "clarify") return
    setSaving(true)
    await finishScan({ input, outcome, originalAi })
    setSaving(false)
    navigate({ name: "home" })
  }

  return (
    <div className="px-4 pt-4 pb-32 lg:mx-auto lg:max-w-[960px] lg:pt-8 lg:pb-16">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" aria-label="Back to Home" onClick={() => navigate({ name: "home" })}>
            <ArrowLeft size={22} />
          </Button>
          <h1 className="display text-3xl">{stage === "pick" ? "Scan an item" : stage === "result" ? "Your answer" : "Scan"}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={scanAgain}
          aria-label="Scan again immediately with camera"
          className="ww-press pill-glass flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
        >
          <Camera size={16} className="text-green" />
          <span>Scan Again</span>
        </Button>
      </header>

      {stage === "pick" && (
        <IdentifyCard index={0} className="lg:mx-auto lg:max-w-[640px]" onImage={(img) => (setInput(emptyInput(img)), setStage("preview"))} onText={(t) => run(emptyInput(null, t))} />
      )}

      {stage === "preview" && input.image && (
        <div className="ww-fade-up space-y-4 lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 lg:space-y-0">
          <img src={input.image.dataUrl} alt="Your photo" className="max-h-[56dvh] w-full rounded-[18px] border-[6px] border-white object-cover shadow-lift lg:max-h-[70vh]" />
          <div className="space-y-4">
          <label className="block">
            <span className="on-sky mb-1.5 block text-sm font-semibold">Add details (optional)</span>
            <span className="flex gap-2">
              <input
                value={input.description}
                onChange={(e) => setInput((p) => ({ ...p, description: e.target.value }))}
                placeholder={detailsMic.listening ? "Listening…" : "e.g. it's oily, has a plastic window"}
                className="field h-12 min-w-0 flex-1 px-5 text-[15px]"
              />
              <MicButton listening={detailsMic.listening} onClick={detailsMic.toggle} size={48} />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" onClick={retake}>
              <Camera size={18} /> Retake
            </Button>
            <Button size="lg" onClick={() => run(input)}>
              <Check size={18} /> Use this photo
            </Button>
          </div>
          </div>
        </div>
      )}

      {stage === "analyzing" && <AnalysisView thumbnail={input.image?.thumbnail ?? null} />}

      {stage === "clarify" && outcome?.kind === "clarify" && (
        <ClarificationCard
          ai={outcome.ai}
          question={outcome.question}
          options={outcome.options}
          thumbnail={input.image?.thumbnail ?? null}
          onAnswer={(answer) => run({ ...input, clarifications: [...input.clarifications, { question: outcome.question, answer }] })}
          onRetakePhoto={retake}
        />
      )}

      {stage === "result" && outcome && outcome.kind !== "clarify" && (
        <OutcomeView
          outcome={outcome}
          image={input.image?.dataUrl ?? null}
          corrected={!!input.correctedItem}
          actions={
            <div className="mt-4 space-y-2">
              {outcome.kind === "not_found" && outcome.reason === "unclear" && (
                <Button variant="outline" className="w-full" onClick={retake}>
                  <Camera size={18} /> Try a clearer photo
                </Button>
              )}
              <ResultActions busy={saving} onGotIt={gotIt} onCorrect={outcome.kind === "multi" ? undefined : () => setCorrecting(true)} onScanAnother={reset} onScanAgain={scanAgain} />
            </div>
          }
        />
      )}

      {stage === "error" && <ErrorCard message={error ?? undefined} onRetry={() => run(input)} />}

      <CorrectionSheet
        open={correcting}
        onClose={() => setCorrecting(false)}
        onSubmit={(item) => {
          setCorrecting(false)
          run({ ...input, clarifications: [], correctedItem: item })
        }}
      />
    </div>
  )
}
